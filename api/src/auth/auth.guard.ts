import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PublicUser } from '../users/public-user';
import { Request } from 'express';

export type AuthRequest = Request & { user: PublicUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.sid;

    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    const session = await this.authService.findSessionByToken(token);

    if (!session) {
      throw new UnauthorizedException('Not authenticated');
    }

    request.user = session.user;

    return true;
  }
}
