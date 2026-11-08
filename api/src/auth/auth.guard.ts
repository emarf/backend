import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PublicUser } from '../users/public-user';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

export type AuthRequest = Request & { user: PublicUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.sid;
    const authorization = request.headers.authorization;
    const [_, jwtToken] = authorization?.startsWith('Bearer ')
      ? authorization.split(' ')
      : [];

    if (jwtToken) {
      const user = await this.authService.verifyToken(jwtToken);

      if (!user) {
        throw new UnauthorizedException('Not authenticated');
      }

      request.user = user;

      return true;
    }

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
