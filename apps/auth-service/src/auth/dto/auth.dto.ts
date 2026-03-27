import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Номер телефона обязателен' })
  @Matches(/^\+7\d{10}$/, { message: 'Формат: +7XXXXXXXXXX (Казахстан)' })
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Номер телефона обязателен' })
  @Matches(/^\+7\d{10}$/, { message: 'Формат: +7XXXXXXXXXX' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'Код должен содержать 6 цифр' })
  @Matches(/^\d{6}$/, { message: 'Код должен содержать только цифры' })
  code: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token обязателен' })
  refreshToken: string;
}

export class LogoutDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token обязателен' })
  refreshToken: string;
}
