import { IsString, IsNotEmpty, IsIn } from 'class-validator';

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
