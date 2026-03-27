import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IikoAuthService {
  private readonly logger = new Logger(IikoAuthService.name);
  private readonly redis: Redis;
  private readonly baseUrl = 'https://api-ru.iiko.services/api/1';
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
    const apiKey = process.env.IIKO_API_KEY;
    if (!apiKey) {
      throw new Error('IIKO_API_KEY is not set');
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(
            `${this.baseUrl}/access_token`,
            { apiLogin: apiKey },
            { timeout: 30000 }
          )
        );

        const token = response.data?.token;
        if (!token) {
          throw new Error('No token in response');
        }

        this.logger.log(`iiko access token obtained (attempt ${attempt + 1})`);
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
