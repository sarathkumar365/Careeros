# RabbitMQ Flow in Careeros

This document reflects the current queue flow in:
- `apps/bff/src/queue/enqueue.service.ts`
- `apps/bff/src/queue/dequeue.service.ts`
- `apps/bff/src/rabbitmq/rabbitmq.module.ts`
- `services/ai/src/orchestrator.py`

## Topology
- Submission exchange: `jobs.submission` (topic, durable)
- Submission routing key: `job.submitted`
- Worker queue (AI): `jobs.submission.worker` (durable, bound to `job.submitted`)
- Events exchange: `jobs.events` (topic, durable)
- BFF events queue: `jobs.events.bff` (durable, bound to `job.#`)

## Current BFF components
- Rabbit connection/channel: `RabbitMqModule`
- Publisher: `EnqueueService`
- Consumer: `DequeueService`
- Orchestrator callback target: `WorkflowService.handleTaskCompletion`

## Current AI components
- Queue consumer/publisher: `OrchestratorService` in `services/ai/src/orchestrator.py`
- Rabbit connection manager: `RabbitManager`

## Submission flow (BFF -> AI)
1. Frontend calls `POST /jobs`.
2. `JobApplicationService.createJobApplication` saves the DB record and starts workflow.
3. `WorkflowService.createApplication` triggers:
   - `resume.parsing`
   - `checklist.parsing`
4. Task bundles call `EnqueueService.enqueue*`, which publishes JSON payloads with:
   - `messageType`
   - `jobId` header
   - persistent delivery mode
5. AI orchestrator consumes from `jobs.submission.worker`, validates payload, and executes the corresponding handler.

## Completion flow (AI -> BFF)
1. AI publishes event payloads to `jobs.events` with routing key `job.<eventType>`.
2. `DequeueService` consumes from `jobs.events.bff`.
3. For each event, BFF calls `WorkflowService.handleTaskCompletion`.
4. Workflow updates task state, persists `workflowSteps`, runs `onSuccess/onFailed`, and starts next ready tasks.

## Task/event contract
- Task message types:
  - `resume.parsing`
  - `resume.tailoring`
  - `checklist.parsing`
  - `checklist.matching`
  - `score.updating` (BFF-local execution)
- Result event types:
  - `<task>.completed`
  - `<task>.failed`

## Notes
- The BFF Rabbit connection currently has a known reconnect gap if connection drops (see comment in `rabbitmq.module.ts`).
- Do not change existing task/event type strings in place; extend with new types.
