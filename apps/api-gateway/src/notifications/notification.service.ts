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

  async registerToken(
    userId: string,
    fcmToken: string,
    platform: string,
  ): Promise<void> {
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

  // ─── Notification preference check ──────────────────────────────────────

  private async isNotificationEnabled(
    userId: string,
    type: string,
  ): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    return pref?.enabled ?? true; // default: enabled when no row exists
  }

  // ─── Send to user ────────────────────────────────────────────────────────

  async sendToUser(
    userId: string,
    type: string,
    message: FcmMessage,
  ): Promise<void> {
    if (!(await this.isNotificationEnabled(userId, type))) {
      this.logger.debug(
        `Notification type ${type} disabled for user ${userId} — skipping`,
      );
      return;
    }

    const tokens = await this.prisma.notificationToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No active FCM tokens for user ${userId}`);
      return;
    }

    const results = await Promise.allSettled(
      tokens.map((t) => this.sendFcm(t.fcmToken, message)),
    );

    // Deactivate failed tokens (e.g. uninstalled app)
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && !result.value.success) {
        const errorMsg = result.value.error ?? '';
        if (
          errorMsg.includes('NOT_FOUND') ||
          errorMsg.includes('UNREGISTERED')
        ) {
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
        data: message.data,
      },
    });
  }

  // ─── Send to all users with role ─────────────────────────────────────────

  async sendToRole(
    role: string,
    type: string,
    message: FcmMessage,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { role: role as never, isActive: true },
      select: { id: true },
    });

    await Promise.allSettled(
      users.map((u) => this.sendToUser(u.id, type, message)),
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

  async triggerLowRevenueAlert(
    restaurantName: string,
    amount: number,
    threshold: number,
  ): Promise<void> {
    const msg: FcmMessage = {
      title: 'Низкая выручка',
      body: `${restaurantName}: ${amount.toLocaleString('ru-RU')} ₸ (порог: ${threshold.toLocaleString('ru-RU')} ₸)`,
      data: {
        restaurantName,
        amount: String(amount),
        threshold: String(threshold),
      },
    };
    await Promise.allSettled([
      this.sendToRole('OWNER', 'LOW_REVENUE', msg),
      this.sendToRole('OPERATIONS_DIRECTOR', 'LOW_REVENUE', msg),
    ]);
  }

  async triggerLargeExpenseAlert(
    restaurantName: string,
    articleName: string,
    amount: number,
  ): Promise<void> {
    const msg: FcmMessage = {
      title: 'Крупный расход',
      body: `${restaurantName} — ${articleName}: ${amount.toLocaleString('ru-RU')} ₸`,
      data: { restaurantName, articleName, amount: String(amount) },
    };
    await Promise.allSettled([
      this.sendToRole('OWNER', 'LARGE_EXPENSE', msg),
      this.sendToRole('FINANCE_DIRECTOR', 'LARGE_EXPENSE', msg),
    ]);
  }

  async triggerSyncFailureAlert(system: string, error: string): Promise<void> {
    await this.sendToRole('OWNER', 'SYNC_FAILURE', {
      title: `Ошибка синхронизации ${system}`,
      body: error.slice(0, 200),
      data: { system, error: error.slice(0, 500) },
    });
  }

  async handleInternalTrigger(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    switch (type) {
      case 'SYNC_FAILURE':
        await this.triggerSyncFailureAlert(
          payload.system as string,
          payload.error as string,
        );
        break;
      case 'LOW_REVENUE':
        await this.triggerLowRevenueAlert(
          payload.restaurantName as string,
          payload.amount as number,
          payload.threshold as number,
        );
        break;
      case 'LARGE_EXPENSE':
        await this.triggerLargeExpenseAlert(
          payload.restaurantName as string,
          payload.articleName as string,
          payload.amount as number,
        );
        break;
      default:
        this.logger.warn(`Unknown trigger type: ${type}`);
    }
  }

  async getUserPreferences(userId: string) {
    const types = ['SYNC_FAILURE', 'LOW_REVENUE', 'LARGE_EXPENSE'];
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });
    return types.map((type) => {
      const pref = prefs.find((p) => p.type === type);
      return { type, enabled: pref?.enabled ?? true };
    });
  }

  async updatePreference(
    userId: string,
    type: string,
    enabled: boolean,
  ): Promise<void> {
    await this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      update: { enabled },
      create: { userId, type, enabled },
    });
  }

  // ─── FCM HTTP v1 API ─────────────────────────────────────────────────────

  private async sendFcm(
    fcmToken: string,
    message: FcmMessage,
  ): Promise<FcmSendResult> {
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
          Authorization: `Bearer ${token}`,
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

      const data = (await res.json()) as unknown;
      return {
        success: true,
        messageId: (data as { name: string }).name,
      };
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
    const privateKey = this.config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      throw new Error('Firebase credentials not configured');
    }

    // JWT for Google OAuth2
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ).toString('base64url');

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

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }
}
