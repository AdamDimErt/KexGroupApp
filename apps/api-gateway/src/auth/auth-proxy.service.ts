import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AuthProxyService {
  private readonly logger = new Logger(AuthProxyService.name);
  private readonly authUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const url = config.get<string>('AUTH_SERVICE_URL');
    if (!url) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('AUTH_SERVICE_URL env var is required in production');
      }
      this.logger.warn(
        'AUTH_SERVICE_URL not set, falling back to http://localhost:3001 (dev only)',
      );
    }
    this.authUrl = url ?? 'http://localhost:3001';
  }

  async forward<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.authUrl}${path}`;
    try {
      const response = await firstValueFrom(
        this.http.request<T>({ method, url, data: body, headers }),
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response) {
        throw new HttpException(
          axiosErr.response.data as object,
          axiosErr.response.status,
        );
      }
      this.logger.error(`Ошибка проксирования к auth-service: ${String(err)}`);
      throw new HttpException('Auth service недоступен', 503);
    }
  }
}
