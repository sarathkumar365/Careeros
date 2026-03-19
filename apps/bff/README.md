# BFF (Backend for Frontend)

## Description

NestJS backend service with Fastify adapter for the Job AI Helper application.

## Setup

```bash
# Install dependencies
bun install
```

## Run

```bash
# Development with hot reload
bun run start:dev

# Production
bun run start:prod
```

## Configuration

- Default port: 3001
- Fastify adapter configured
- CORS handled by frontend proxy
- Auth environment variables:
  - `AUTH_JWT_SECRET` (required outside local dev)
  - `AUTH_JWT_EXPIRES_IN` (optional, default `7d`)
  - `AUTH_ADMIN_EMAIL` + `AUTH_ADMIN_PASSWORD` (optional admin bootstrap)
