/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

function createAuthService(overrides?: {
  findUnique?: jest.Mock;
  create?: jest.Mock;
  upsert?: jest.Mock;
}) {
  const database = {
    user: {
      findUnique: overrides?.findUnique ?? jest.fn(),
      create: overrides?.create ?? jest.fn(),
      upsert: overrides?.upsert ?? jest.fn(),
    },
  } as any;

  return {
    service: new AuthService(database),
    database,
  };
}

describe('AuthService', () => {
  it('hashes password on signup', async () => {
    const { service, database } = createAuthService();
    database.user.findUnique.mockResolvedValue(null);
    database.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER' as UserRole,
    });

    const user = await service.signUp('user@example.com', 'password123');

    expect(user.id).toBe('user-1');
    const createArgs = database.user.create.mock.calls[0][0];
    expect(createArgs.data.passwordHash).not.toBe('password123');
  });

  it('rejects duplicate signup email', async () => {
    const { service, database } = createAuthService();
    database.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.signUp('existing@example.com', 'password123'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps unique constraint race to conflict during signup create', async () => {
    const { service, database } = createAuthService();
    database.user.findUnique.mockResolvedValue(null);
    database.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.signUp('existing@example.com', 'password123'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects signin with invalid password', async () => {
    const { service, database } = createAuthService();
    database.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER' as UserRole,
      passwordHash:
        '$2b$12$9KxvZd0qN.3Nw5J4n5k8uONWYSdn98wBsoMteQh.kxypdIN5v53.y',
    });

    await expect(
      service.signIn('user@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates a JWT and resolves user from token', async () => {
    const { service, database } = createAuthService();
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER' as UserRole,
    };

    const token = service.createToken(user);
    database.user.findUnique.mockResolvedValue(user);

    await expect(service.resolveUserFromToken(token)).resolves.toEqual(user);
  });
});
