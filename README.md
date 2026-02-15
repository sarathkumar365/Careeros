# ApplyWise

AI-powered resume analysis and ATS scoring system.

## Open AI API key setup
Inside your terminal, run

```
echo 'export OPENAI_API_KEY="sk-...your-key..."' >> ~/.zshrc
source ~/.zshrc
```

## Postgres setup (local)
- Install Postgres  
  - macOS: `brew install postgresql` && `brew services start postgresql`  
  - Ubuntu/Debian: `sudo apt-get install -y postgresql` && `sudo systemctl enable --now postgresql`
- Create database and user (run in psql as a superuser):  
  - If `postgres` role doesn’t exist (common on macOS/Homebrew), use your local user: `psql -U $(whoami)`  
  - On Linux you can also run `sudo -u postgres psql`  
  ```sql
  CREATE USER applywise WITH PASSWORD 'applywise';
  CREATE DATABASE applywise OWNER applywise;
  ALTER SCHEMA public OWNER TO applywise;
  GRANT ALL PRIVILEGES ON DATABASE applywise TO applywise;
  GRANT USAGE, CREATE ON SCHEMA public TO applywise;
  ```
- Persist `DATABASE_URL` so new terminals have it (zsh example):  
  ```
  echo 'export DATABASE_URL="postgresql://applywise:applywise@localhost:5432/applywise?schema=public"' >> ~/.zshrc
  source ~/.zshrc
  ```
  For bash, append to `~/.bashrc` instead and `source ~/.bashrc`.
- Apply the Prisma schema to your DB (run once after DATABASE_URL is set):  
  ```bash
  cd apps/bff
  bunx prisma migrate deploy
  cd ../..
  ```

## Project Structure

```
applywise/
├── apps/
│   ├── web/        # Frontend - React + Vite
│   └── bff/        # Backend for Frontend - NestJS
├── services/
│   └── ai/         # AI Service - Python FastAPI
└── docs/           # Documentation
```

## Setup

See individual service READMEs for detailed setup:

- [Frontend](./apps/web/README.md) - Vite + React + TypeScript
- [Backend](./apps/bff/README.md) - NestJS + Fastify
- [AI Service](./services/ai/README.md) - FastAPI + OpenAI

### Prerequisites

- Docker installed with the daemon running  
  - macOS: `brew install --cask docker` then open Docker Desktop and complete setup  - IMPORTANT 
  - Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y docker.io` then `sudo systemctl enable --now docker`
- RabbitMQ reachable on `localhost:5672`  
  - Quick start: From ROOT of the project ` cd services/infra/rabbitmq` then run `docker compose up` (This will start rabbit, Now close & open the current terminal OR open new one).
- Tooling: `uv`, `bun`, `python3`   
  - `uv`: `curl -LsSf https://astral.sh/uv/install.sh | sh`  
  - `bun`: `curl -fsSL https://bun.sh/install | bash`  
  - Python 3 (if needed)  
    - macOS: `brew install python`  
    - Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y python3 python3-venv`

## Quick Start

1. Install dependencies in each service directory - go inside apps/web,apps/bff, and services/ai and follow README
2. Start all services (see individual READMEs)
3. Services run on:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3001`
   - AI Service: `http://localhost:8989`

## Similar Projects

- [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume) - A free and open-source resume builder that respects privacy

## You can also use the local_start.sh script inside scripts/local folder.
