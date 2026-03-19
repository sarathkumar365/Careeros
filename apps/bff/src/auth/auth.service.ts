import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';
import { resolveJwtExpiresIn, resolveJwtSecret } from './auth.constants';
import type { AuthJwtPayload, AuthenticatedUser } from './types/auth.types';

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code === 'P2002'
  );
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdminFromEnv();
  }

  async signUp(email: string, password: string): Promise<AuthenticatedUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.database.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user: AuthenticatedUser;
    try {
      user = await this.database.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: UserRole.USER,
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }

    return user;
  }

  async signIn(email: string, password: string): Promise<AuthenticatedUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.database.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  createToken(user: AuthenticatedUser): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      resolveJwtSecret(),
      {
        expiresIn: resolveJwtExpiresIn() as SignOptions['expiresIn'],
      },
    );
  }

  async resolveUserFromToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = jwt.verify(token, resolveJwtSecret()) as AuthJwtPayload;
      const user = await this.database.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Session is no longer valid');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private async seedAdminFromEnv(): Promise<void> {
    const adminEmail = process.env.AUTH_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.AUTH_ADMIN_PASSWORD?.trim();

    if (!adminEmail && !adminPassword) {
      return;
    }

    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'AUTH_ADMIN_EMAIL and AUTH_ADMIN_PASSWORD must both be set to seed admin user',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await this.database.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
      },
      update: {
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    this.logger.log(`Seeded admin user for ${adminEmail}`);
  }
}
