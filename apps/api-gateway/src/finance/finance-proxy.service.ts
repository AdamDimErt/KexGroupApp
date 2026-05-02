import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class FinanceProxyService {
  private readonly logger = new Logger(FinanceProxyService.name);
  private readonly financeUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const url = config.get<string>('FINANCE_SERVICE_URL');
    if (!url) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FINANCE_SERVICE_URL env var is required in production',
        );
      }
      this.logger.warn(
        'FINANCE_SERVICE_URL not set, falling back to http://localhost:3002 (dev only)',
      );
    }
    this.financeUrl = url ?? 'http://localhost:3002';
  }

  async forward<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.financeUrl}${path}`;
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
      this.logger.error(
        `Ошибка проксирования к finance-service: ${String(err)}`,
      );
      throw new HttpException('Finance service недоступен', 503);
    }
  }
}
