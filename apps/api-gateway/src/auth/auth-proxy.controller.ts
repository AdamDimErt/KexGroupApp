import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthProxyService } from './auth-proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type {
  SendOtpRequestDto,
  VerifyOtpRequestDto,
} from '@dashboard/shared-types';

@ApiTags('Auth')
@Controller('auth')
export class AuthProxyController {
  constructor(private readonly proxy: AuthProxyService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Отправить OTP на телефон' })
  sendOtp(@Body() body: SendOtpRequestDto) {
    return this.proxy.forward('POST', '/auth/send-otp', body);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Проверить OTP и получить токены' })
  verifyOtp(@Body() body: VerifyOtpRequestDto) {
    return this.proxy.forward('POST', '/auth/verify-otp', body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить access token' })
  refresh(@Body() body: { refreshToken: string }) {
    return this.proxy.forward('POST', '/auth/refresh', body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  getMe(@Headers('authorization') authHeader: string) {
    return this.proxy.forward('GET', '/auth/me', undefined, { authorization: authHeader });
  }
}
