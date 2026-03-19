import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from './current-user.decorator';
import {
  AUTH_COOKIE_NAME,
  resolveJwtCookieMaxAgeSeconds,
} from './auth.constants';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { SignInDto, SignUpDto } from './dto/auth.dto';
import type { AuthenticatedUser } from './types/auth.types';

function applyAuthCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: resolveJwtCookieMaxAgeSeconds(),
  });
}

function clearAuthCookie(reply: FastifyReply): void {
  reply.clearCookie(AUTH_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

@Controller('auth')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const user = await this.authService.signUp(dto.email, dto.password);
    const token = this.authService.createToken(user);
    applyAuthCookie(reply, token);
    return user;
  }

  @Post('sign-in')
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const user = await this.authService.signIn(dto.email, dto.password);
    const token = this.authService.createToken(user);
    applyAuthCookie(reply, token);
    return user;
  }

  @Post('sign-out')
  signOut(@Res({ passthrough: true }) reply: FastifyReply) {
    clearAuthCookie(reply);
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
