# Careeros Architecture Source of Truth

Last updated: 2026-03-18

This document is the canonical architecture map for the current codebase.
If other docs conflict with this file, trust this file and then verify in the code paths referenced below.

## Monorepo layout
- Web app: `apps/web`
- BFF API/orchestrator: `apps/bff`
- AI worker service: `services/ai`
- RabbitMQ infra: `services/infra/rabbitmq`

## Core task contract
Defined in:
- `apps/bff/src/types/task.types.ts`
- `services/ai/src/types/message_types.py`

Task types:
- `resume.parsing`
- `checklist.parsing`
- `resume.tailoring`
- `checklist.matching`
- `score.updating`

Event result types:
- `<task>.completed`
- `<task>.failed`

Rule:
- Do not modify existing task/event type strings in place. Extend with new types.

## Runtime responsibilities

### Web (`apps/web`)
- Entry/router: `src/main.tsx`
- API client: `src/api/jobs.ts`
- Editor websocket integration: `src/hooks/useEditorWebSocket.ts`
- Local resume state + Typst compile: `src/typst-compiler/resumeState.ts`
- Checklist/tailoring trigger UI: `src/components/checklist/Checklist.tsx`, `src/components/ai-status/*`

### BFF (`apps/bff`)
- App wiring: `src/app.module.ts`, `src/main.ts`
- HTTP endpoints: `src/jobs/jobs.controller.ts`
- Job service: `src/jobs/job-application.service.ts`
- Workflow orchestrator (DAG + persistence): `src/workflow/workflow.service.ts`, `src/workflow/workflow.types.ts`
- Queue publisher/consumer: `src/queue/enqueue.service.ts`, `src/queue/dequeue.service.ts`
- Websocket server + broadcasting: `src/websocket/websocket.service.ts`
- Score calculation: `src/scoring/scoring.service.ts`
- Persistence schema: `prisma/schema.prisma`

### AI (`services/ai`)
- FastAPI app/lifecycle: `src/app.py`, `main.py`
- Rabbit consumer + event publisher: `src/orchestrator.py`
- Task handlers:
  - resume parsing/tailoring: `src/services/resume.py`
  - checklist parsing/matching: `src/services/checklist.py`
- Rabbit connection manager: `src/infrastructure/rabbit_manager.py`

## End-to-end flow
1. Web creates a job with `POST /jobs`.
2. BFF persists `job_applications` record and starts workflow (`create-application`).
3. BFF enqueues AI tasks to `jobs.submission` (`resume.parsing`, `checklist.parsing`).
4. AI consumes submission jobs, runs LLM handlers, and publishes results to `jobs.events`.
5. BFF dequeues events from `jobs.events.bff`, updates workflow state, runs side effects, and starts next ready tasks.
6. BFF broadcasts task events to `/jobs/:jobId/events`.
7. Web updates React Query cache and Zustand state, then re-renders checklist/score/resume preview.

## Workflow DAGs
Defined in `apps/bff/src/workflow/workflow.types.ts`.

`create-application`:
- `resume.parsing` + `checklist.parsing` (parallel)
- then `checklist.matching`
- then `score.updating`

`tailoring`:
- `resume.tailoring`
- then `checklist.matching`
- then `score.updating`

Workflow state is persisted in `job_applications.workflowSteps` and status in `job_applications.workflowStatus`.

## Queue topology

Submission path:
- exchange: `jobs.submission` (topic)
- routing key: `job.submitted`
- AI queue: `jobs.submission.worker`

Event path:
- exchange: `jobs.events` (topic)
- BFF queue: `jobs.events.bff`
- binding key: `job.#`

## Websocket contract
- Endpoint: `GET /jobs/:jobId/events`
- Event payloads are task result events from the same task contract.
- Backend broadcaster: `apps/bff/src/websocket/websocket.service.ts`
- Frontend consumer: `apps/web/src/hooks/useEditorWebSocket.ts`

## Known constraints
- BFF RabbitMQ connection currently lacks automatic reconnect after drop (`apps/bff/src/rabbitmq/rabbitmq.module.ts` comment).
- `score.updating` is computed in BFF, not AI.
- Frontend relies on `zod` v3 compatibility for `zod-to-json-schema` during schema generation.

