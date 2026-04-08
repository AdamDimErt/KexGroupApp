import { IsString, IsNotEmpty, IsIn, IsBoolean, IsObject } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'FCM token обязателен' })
  fcmToken: string;

  @IsString()
  @IsIn(['ios', 'android'], { message: 'Платформа: ios или android' })
  platform: string;
}

export class UnregisterTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'FCM token обязателен' })
  fcmToken: string;
}

export class UpdatePreferenceDto {
  @IsBoolean()
  enabled: boolean;
}

export class InternalTriggerDto {
  @IsString()
  @IsIn(['SYNC_FAILURE', 'LOW_REVENUE', 'LARGE_EXPENSE'])
  type: string;

  @IsObject()
  payload: Record<string, unknown>;
}
