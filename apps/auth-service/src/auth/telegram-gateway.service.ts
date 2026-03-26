import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendVerificationResponse {
  ok: boolean;
  result?: {
    request_id: string;
    phone_number: string;
    request_cost: number;
    remaining_balance: number;
    delivery_status: {
      status: string;
      updated_at: number;
    };
  };
  error?: string;
}

interface CheckVerificationResponse {
  ok: boolean;
  result?: {
    request_id: string;
    phone_number: string;
    code_valid: boolean;
    code_entered: string;
  };
  error?: string;
}

interface CheckAbilityResponse {
  ok: boolean;
  result?: {
    request_id: string;
    request_cost: number;
    remaining_balance: number;
  };
  error?: string;
}

@Injectable()
export class TelegramGatewayService {
  private readonly logger = new Logger(TelegramGatewayService.name);
  private readonly baseUrl = 'https://gatewayapi.telegram.org';

  constructor(private readonly config: ConfigService) {}

  private get token(): string {
    return this.config.get<string>('TELEGRAM_GATEWAY_TOKEN') ?? '';
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Telegram Gateway HTTP error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Отправить код верификации на номер телефона через @VerificationCodes.
   * Возвращает request_id для последующей проверки.
   */
  async sendVerificationMessage(phone: string, ttlSec = 300): Promise<string> {
    const data = await this.request<SendVerificationResponse>('sendVerificationMessage', {
      phone_number: phone,
      code_length: 6,
      ttl: ttlSec,
    });

    if (!data.ok || !data.result) {
      this.logger.error(`sendVerificationMessage failed: ${data.error}`);
      throw new Error(data.error ?? 'TELEGRAM_GATEWAY_ERROR');
    }

    this.logger.log(`OTP sent to ${phone}, request_id: ${data.result.request_id}`);
    return data.result.request_id;
  }

  /**
   * Проверить, может ли пользователь получить код (без фактической отправки).
   * Внимание: списывает стоимость одного сообщения при успехе.
   */
  async checkSendAbility(phone: string): Promise<boolean> {
    try {
      const data = await this.request<CheckAbilityResponse>('checkSendAbility', {
        phone_number: phone,
      });
      return data.ok;
    } catch {
      return false;
    }
  }

  /**
   * Проверить введённый пользователем код.
   * Возвращает true если код верный.
   */
  async checkVerificationStatus(requestId: string, code: string): Promise<boolean> {
    const data = await this.request<CheckVerificationResponse>('checkVerificationStatus', {
      request_id: requestId,
      code: code,
    });

    if (!data.ok || !data.result) {
      this.logger.warn(`checkVerificationStatus failed: ${data.error}`);
      return false;
    }

    return data.result.code_valid;
  }
}
