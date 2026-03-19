import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './types/auth.types';

export type AuthenticatedRequest = FastifyRequest & {
  user: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = await this.authService.resolveUserFromToken(token);
    return true;
  }
}
