# Documentation Index

Start here, then drill down.

## Primary architecture reference

- `architecture-source-of-truth.md` - Canonical architecture and flow map rooted in current code paths.

## Flow references

- `high-level.md` - Five-stage workflow summary.
- `ws-to-ui-flow.md` - Frontend cache/store update path for websocket events.
- `sarath-docs/rabbitmq-flow.md` - Current RabbitMQ topology and BFF/AI message flow.
- `sarath-docs/websocket-flow.md` - Current websocket lifecycle and event delivery.

## Getting started

This section is essential for onboarding and local context.

## Technology Stack

A good understanding of the following.

### Frontend (Vite + React)

- **Framework:** React with Vite
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Data Fetching:** TanStack Query
- **Routing:** TanStack Router
- **Validation:** Zod
- **Package Manager:** Bun

### Backend (NestJS)

- **Framework:** NestJS (with Fastify adapter)
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Package Manager:** Bun

### AI & Message Queue

- **AI Service:** Python
- **Message Broker:** RabbitMQ
- **Containerization:** Docker

### Database

- **Primary Database:** PostgreSQL

## File Structure

The project is organized into a monorepo structure with a clear separation of
concerns:

- `apps/web/`: frontend
- `apps/bff/`: "Backend-for-Frontend" NestJS application.
- `services/ai/`: Python-based AI service.
- `services/infra/`: Infrastructure configurations including RabbitMQ.
- `docs/`: Project documentation.
- `scripts/`: Utility scripts (may not up-to-date)

## Git Workflow

The project follows a feature-branch workflow

- **`feat/*`**: All new features or bug fixes should be developed on a feature
  branch. These branches are created from `dev`.
- **`dev`**: This is the main development branch. Once a feature is complete
  and reviewed, its branch is merged into `dev` using a no-fast-forward merge
  (`git merge --no-ff`) to preserve its history.
- **`main`**: This branch represents the stable, production-ready version of
  the code. Changes from `dev` are periodically squashed and merged into
  `main` to maintain a clean and linear project history.

## Important files to read next

1.  Read every `README.md` in the subdirectories to understand each part of the
    project in more detail.
