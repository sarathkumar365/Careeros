export const AUTH_COOKIE_NAME = 'careeros_auth';
export const DEFAULT_JWT_EXPIRES_IN = '7d';
const DEFAULT_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const LOCAL_NODE_ENVS = new Set(['development', 'dev', 'local', 'test']);

export function resolveJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret;
  }

  const env = process.env.NODE_ENV?.trim().toLowerCase() ?? 'development';
  if (!LOCAL_NODE_ENVS.has(env)) {
    throw new Error(
      `AUTH_JWT_SECRET must be set when NODE_ENV=${env}`,
    );
  }

  // Local/dev fallback only.
  return 'careeros-dev-secret-change-me';
}

export function resolveJwtExpiresIn(): string {
  const expiresIn = process.env.AUTH_JWT_EXPIRES_IN;
  if (expiresIn && expiresIn.trim().length > 0) {
    return expiresIn;
  }

  return DEFAULT_JWT_EXPIRES_IN;
}

export function resolveJwtCookieMaxAgeSeconds(): number {
  const expiresIn = resolveJwtExpiresIn().trim();
  const numeric = Number.parseInt(expiresIn, 10);

  if (/^\d+$/.test(expiresIn) && Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const match = /^(\d+)\s*([smhdw])$/i.exec(expiresIn);
  if (!match) {
    return DEFAULT_COOKIE_MAX_AGE_SECONDS;
  }

  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_COOKIE_MAX_AGE_SECONDS;
  }

  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    case 'w':
      return value * 60 * 60 * 24 * 7;
    default:
      return DEFAULT_COOKIE_MAX_AGE_SECONDS;
  }
}
