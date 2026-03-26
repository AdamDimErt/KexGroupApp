import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

interface FcmMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface FcmSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly config: ConfigService,
    @Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient,
  ) {}

  // ─── Register FCM token ──────────────────────────────────────────────────

  async registerToken(userId: string, fcmToken: string, platform: string): Promise<void> {
    await this.prisma.notificationToken.upsert({
      where: { fcmToken },
      update: { userId, platform, isActive: true, updatedAt: new Date() },
      create: { userId, fcmToken, platform },
    });
    this.logger.log(`FCM token registered for user ${userId} (${platform})`);
  }

  async unregisterToken(fcmToken: string): Promise<void> {
    await this.prisma.notificationToken.updateMany({
      where: { fcmToken },
      data: { isActive: false },
    });
  }

  // ─── Send to user ────────────────────────────────────────────────────────

  async sendToUser(userId: string, type: string, message: FcmMessage): Promise<void> {
    const tokens = await this.prisma.notificationToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No active FCM tokens for user ${userId}`);
      return;
    }

    const results = await Promise.allSettled(
      tokens.map(t => this.sendFcm(t.fcmToken, message)),
    );

    // Deactivate failed tokens (e.g. uninstalled app)
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && !result.value.success) {
        const errorMsg = result.value.error ?? '';
        if (errorMsg.includes('NOT_FOUND') || errorMsg.includes('UNREGISTERED')) {
          await this.unregisterToken(tokens[i].fcmToken);
          this.logger.warn(`Deactivated stale token for user ${userId}`);
        }
      }
    }

    // Log notification
    await this.prisma.notificationLog.create({
      data: {
        userId,
        type,
        title: message.title,
        body: message.body,
        data: message.data ? JSON.parse(JSON.stringify(message.data)) : undefined,
      },
    });
  }

  // ─── Send to all users with role ─────────────────────────────────────────

  async sendToRole(role: string, type: string, message: FcmMessage): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { role: role as never, isActive: true },
      select: { id: true },
    });

    await Promise.allSettled(
      users.map(u => this.sendToUser(u.id, type, message)),
    );
  }

  // ─── Get notifications for user ──────────────────────────────────────────

  async getUserNotifications(userId: string, page = 1, pageSize = 20) {
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notificationLog.count({ where: { userId } }),
      this.prisma.notificationLog.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, unreadCount, total, page, pageSize };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notificationLog.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notificationLog.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ─── Alert triggers (called by aggregator-worker) ────────────────────────

  async triggerLowRevenueAlert(restaurantName: string, amount: number, threshold: number): Promise<void> {
    await this.sendToRole('OWNER', 'LOW_REVENUE', {
      title: 'Низкая выручка',
      body: `${restaurantName}: ${amount.toLocaleString('ru-RU')} ₸ (порог: ${threshold.toLocaleString('ru-RU')} ₸)`,
      data: { restaurantName, amount: String(amount), threshold: String(threshold) },
    });
  }

  async triggerLargeExpenseAlert(restaurantName: string, articleName: string, amount: number): Promise<void> {
    await this.sendToRole('OWNER', 'LARGE_EXPENSE', {
      title: 'Крупный расход',
      body: `${restaurantName} — ${articleName}: ${amount.toLocaleString('ru-RU')} ₸`,
      data: { restaurantName, articleName, amount: String(amount) },
    });
  }

  async triggerSyncFailureAlert(system: string, error: string): Promise<void> {
    await this.sendToRole('ADMIN', 'SYNC_FAILURE', {
      title: `Ошибка синхронизации ${system}`,
      body: error.slice(0, 200),
      data: { system, error: error.slice(0, 500) },
    });
  }

  // ─── FCM HTTP v1 API ─────────────────────────────────────────────────────

  private async sendFcm(fcmToken: string, message: FcmMessage): Promise<FcmSendResult> {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    if (!projectId) {
      this.logger.warn('[DEV] FCM not configured — skipping push');
      return { success: true, messageId: 'dev-skip' };
    }

    try {
      const token = await this.getAccessToken();
      const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: {
              title: message.title,
              body: message.body,
            },
            data: message.data,
            android: {
              priority: 'high',
              notification: { sound: 'default' },
            },
            apns: {
              payload: { aps: { sound: 'default', badge: 1 } },
            },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const errBody = await res.text();
        this.logger.error(`FCM error [${res.status}]: ${errBody}`);
        return { success: false, error: errBody };
      }

      const data = await res.json() as { name: string };
      return { success: true, messageId: data.name };
    } catch (e) {
      this.logger.error('FCM send failed', e);
      return { success: false, error: String(e) };
    }
  }

  private async getAccessToken(): Promise<string> {
    // Use service account credentials to get OAuth2 token for FCM v1
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      throw new Error('Firebase credentials not configured');
    }

    // JWT for Google OAuth2
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })).toString('base64url');

    const { createSign } = await import('crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(privateKey, 'base64url');

    const jwt = `${header}.${payload}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await res.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }
}
