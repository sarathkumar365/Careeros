import { resolveJwtSecret } from './auth.constants';

describe('resolveJwtSecret', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when secret is missing in non-local environments', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'staging',
      AUTH_JWT_SECRET: '',
    };

    expect(() => resolveJwtSecret()).toThrow(
      'AUTH_JWT_SECRET must be set when NODE_ENV=staging',
    );
  });

  it('uses fallback in local environments when secret is missing', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      AUTH_JWT_SECRET: '',
    };

    expect(resolveJwtSecret()).toBe('careeros-dev-secret-change-me');
  });
});
