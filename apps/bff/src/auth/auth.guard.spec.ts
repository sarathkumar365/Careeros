/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

function createExecutionContext(
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  it('rejects when cookie is missing', async () => {
    const guard = new AuthGuard({
      resolveUserFromToken: jest.fn(),
    } as any);

    await expect(
      guard.canActivate(
        createExecutionContext({
          cookies: {},
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches resolved user when token is valid', async () => {
    const request: Record<string, unknown> = {
      cookies: {
        careeros_auth: 'token',
      },
    };

    const guard = new AuthGuard({
      resolveUserFromToken: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'u@e.com',
        role: 'USER',
      }),
    } as any);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'u@e.com',
      role: 'USER',
    });
  });
});
