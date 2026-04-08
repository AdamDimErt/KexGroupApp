import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import {
  RegisterTokenDto,
  UnregisterTokenDto,
  UpdatePreferenceDto,
  InternalTriggerDto,
} from '../dto/notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('register-token')
  @ApiOperation({ summary: 'Зарегистрировать FCM push token' })
  async registerToken(
    @Req() req: { user: { sub: string } },
    @Body() body: RegisterTokenDto,
  ) {
    await this.notificationService.registerToken(
      req.user.sub,
      body.fcmToken,
      body.platform,
    );
    return { success: true };
  }

  @Post('unregister-token')
  @ApiOperation({ summary: 'Отключить FCM push token' })
  async unregisterToken(@Body() body: UnregisterTokenDto) {
    await this.notificationService.unregisterToken(body.fcmToken);
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: 'Список уведомлений пользователя' })
  async list(
    @Req() req: { user: { sub: string } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(1, page ? parseInt(page, 10) || 1 : 1);
    const ps = Math.min(
      100,
      Math.max(1, pageSize ? parseInt(pageSize, 10) || 20 : 20),
    );
    return this.notificationService.getUserNotifications(req.user.sub, p, ps);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Отметить уведомление как прочитанное' })
  async markAsRead(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    await this.notificationService.markAsRead(req.user.sub, id);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Отметить все уведомления как прочитанные' })
  async markAllAsRead(@Req() req: { user: { sub: string } }) {
    await this.notificationService.markAllAsRead(req.user.sub);
    return { success: true };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Настройки уведомлений пользователя' })
  async getPreferences(@Req() req: { user: { sub: string } }) {
    return this.notificationService.getUserPreferences(req.user.sub);
  }

  @Put('preferences/:type')
  @ApiOperation({ summary: 'Обновить настройку уведомления' })
  async updatePreference(
    @Req() req: { user: { sub: string } },
    @Param('type') type: string,
    @Body() body: UpdatePreferenceDto,
  ) {
    await this.notificationService.updatePreference(
      req.user.sub,
      type,
      body.enabled,
    );
    return { success: true };
  }
}

@ApiTags('Internal')
@Controller('internal/notifications')
export class InternalNotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Internal alert trigger (aggregator-worker)' })
  async internalTrigger(
    @Headers('x-internal-secret') secret: string,
    @Body() body: InternalTriggerDto,
  ) {
    const expected = this.config.get<string>('INTERNAL_API_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    await this.notificationService.handleInternalTrigger(
      body.type,
      body.payload,
    );
    return { success: true };
  }
}
