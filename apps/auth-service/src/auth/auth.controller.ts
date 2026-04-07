import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  LogoutDto,
  BiometricVerifyDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() body: SendOtpDto) {
    return this.authService.generateOtp(body.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() body: VerifyOtpDto, @Req() req: Request) {
    const ip = req.ip ?? req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyOtp(body.phone, body.code, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Body() body: LogoutDto,
    @Req() req: Request,
    @Headers('authorization') authHeader?: string,
  ) {
    let userId: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.jwtService.verify<{ sub: string }>(
          authHeader.slice(7),
        );
        userId = payload.sub;
      } catch {
        // Token expired or invalid — still allow logout
      }
    }
    const ip = req.ip ?? req.headers['x-forwarded-for']?.toString();
    return this.authService.logout(body.refreshToken, userId, ip);
  }

  @Post('biometric/enable')
  @HttpCode(HttpStatus.OK)
  enableBiometric(@Headers('authorization') authHeader: string, @Req() req: Request) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не передан');
    }
    const token = authHeader.slice(7);
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Токен недействителен или истёк');
    }
    const ip = req.ip ?? req.headers['x-forwarded-for']?.toString();
    return this.authService.enableBiometric(payload.sub, ip);
  }

  @Post('biometric/verify')
  @HttpCode(HttpStatus.OK)
  verifyBiometric(@Body() body: BiometricVerifyDto, @Req() req: Request) {
    const ip = req.ip ?? req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyBiometric(body.refreshToken, ip, userAgent);
  }

  @Get('me')
  getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не передан');
    }
    const token = authHeader.slice(7);
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Токен недействителен или истёк');
    }
    return this.authService.getMe(payload.sub);
  }
}
