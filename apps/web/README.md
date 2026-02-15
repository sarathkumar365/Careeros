# Web Frontend

## Tech Stack

- React 19
- Vite
- TanStack Router v1 (code-based routing)
- TanStack Query v5
- TailwindCSS v4
- TypeScript
- Typst render & compiler
- ESLint

## Setup

```bash
# Install dependencies
bun install
```

## Run

```bash
# Development server on port 3000
bun run dev

# Production build
bun run build

# Preview production build
bun run serve
```

## Code Quality

```bash
# Lint
bun run lint

# Check and fix both
bun run check
```

## API Integration

Frontend proxies `/api` requests to BFF on port 3001 (configured in vite.config.ts)
