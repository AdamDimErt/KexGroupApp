import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не передан');
    }

    const token = authHeader.slice(7);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Токен недействителен или истёк');
    }

    return true;
  }
}
