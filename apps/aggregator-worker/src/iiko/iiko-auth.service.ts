import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IikoAuthService {
  private readonly logger = new Logger(IikoAuthService.name);
  private readonly redis: Redis;
  private readonly baseUrl = process.env.IIKO_SERVER_URL || 'https://kexbrands-co.iiko.it:443/resto/api';
  private readonly tokenCacheKey = 'iiko:access_token';
  private readonly tokenCacheTTL = 55 * 60; // 55 minutes

  constructor(private readonly httpService: HttpService) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  async getAccessToken(): Promise<string> {
    // Try to get cached token
    const cachedToken = await this.redis.get(this.tokenCacheKey);
    if (cachedToken) {
      return cachedToken;
    }

    // Fetch new token with retries
    const token = await this.fetchNewToken();

    // Cache token with TTL
    await this.redis.setex(this.tokenCacheKey, this.tokenCacheTTL, token);

    return token;
  }

  private async fetchNewToken(): Promise<string> {
    const login = process.env.IIKO_LOGIN;
    const password = process.env.IIKO_PASSWORD;

    if (!login || !password) {
      throw new Error('IIKO_LOGIN and IIKO_PASSWORD environment variables are required');
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const authUrl = `${this.baseUrl}/auth`;
        const formData = `login=${encodeURIComponent(login)}&pass=${encodeURIComponent(password)}`;
        const response = await firstValueFrom(
          this.httpService.post(authUrl, formData, {
            timeout: 30000,
            responseType: 'text',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
        );

        // iiko Server API returns plain text token
        const token = response.data?.trim();
        if (!token) {
          throw new Error('Empty token response from auth endpoint');
        }

        this.logger.log(`iiko Server API access token obtained (attempt ${attempt + 1})`);
        return token;
      } catch (error) {
        lastError = error as Error;
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `Failed to obtain iiko token (attempt ${attempt + 1}), retrying in ${backoffMs}ms: ${lastError.message}`
        );

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    throw new Error(`Failed to obtain iiko token after ${maxRetries} attempts: ${lastError?.message}`);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
