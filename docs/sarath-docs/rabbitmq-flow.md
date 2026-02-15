# RabbitMQ Flow in Applywise

This doc maps how the BFF publishes and consumes RabbitMQ messages, including what names/keys are used and what each stage does.

## Components and wiring
- Connection/channel: `RabbitMqModule` (apps/bff/src/rabbitmq/rabbitmq.module.ts)
  - Connects to `RABBITMQ_URL` (`amqp://default:default@localhost:5672` fallback).
  - Creates a **confirm channel** with optional prefetch (`RABBITMQ_PREFETCH`, default 5) for back-pressure.
  - Exports tokens `RABBITMQ_CONNECTION_TOKEN` and `RABBITMQ_CHANNEL_TOKEN` for DI.
- Publisher: `QueueService` (apps/bff/src/queue/queue.service.ts)
  - Uses the injected confirm channel to publish job-submission events.
  - Exchange: `JOB_SUBMISSION_EXCHANGE` env or `jobs.submission` default (type `topic`, durable).
  - Routing key: `JOB_SUBMISSION_ROUTING_KEY` env or `job.submitted` default.
  - Message header: `jobId` (copied from payload), `contentType: application/json`, `deliveryMode: 2` (persistent), plus a `messageType` field in the body.
  - Waits for broker confirms to ensure publish succeeded.
- Producer of work: `JobApplicationService.createJobApplication`
  - Persists the job, then calls `enqueueResumeParsing` and `enqueueChecklistParsing` on `QueueService` (fire-and-forget). Later flows use `enqueueResumeTailoring` / `enqueueChecklistMatching`.
- Consumer for completed events: `JobCompletionHandler` (apps/bff/src/ws-event-streaming/job-completion-handler.ts)
  - Exchange: `jobs.events` (topic, durable).
  - Queue: `jobs.events.bff` (durable).
  - Binding key: `job.#` (receives any job event).
  - Consumes with `noAck: false`; ACKs after handling. On each event, dispatches side effects and pushes updates to WebSocket subscribers.

## Publish flow (BFF → AI workers)
1) Frontend submits a job application -> `JobApplicationService.createJobApplication` persists it.
2) For each async task, it builds payloads:
   - Resume parsing: `{ jobId, rawResumeContent, jsonSchema }` with `messageType: resume.parsing`.
   - Checklist parsing: `{ jobId, jobDescription }` with `messageType: checklist.parsing`.
3) `QueueService.publishEvent` JSON-encodes payload+`messageType`, publishes to `exchange=jobs.submission`, `routingKey=job.submitted`, persistent, header `jobId`, waits for confirm.
4) AI worker service binds queues to `jobs.submission` (e.g., key `job.submitted`) and processes messages.

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant BFF as BFF (Nest)
  participant MQ as RabbitMQ (exchange jobs.submission)
  participant AI as AI Worker

  FE->>BFF: POST /jobs (create)
  BFF->>BFF: save job + build payloads
  BFF->>MQ: publish resume.parsing (routing: job.submitted)
  BFF->>MQ: publish checklist.parsing (routing: job.submitted)
  MQ-->>AI: deliver messages to bound queues
  AI-->>MQ: ACK after processing
```

## Completion flow (AI workers → BFF → clients)
AI services emit completion events to a separate exchange that the BFF consumes.

```mermaid
flowchart LR
  AI[A I Worker] -- publish type=resume.parsing.completed --> EX[jobs.events exchange]
  EX -- binding job.# --> Q[jobs.events.bff queue]
  Q -- consume --> HC[JobCompletionHandler]
  HC --> DB[(DB updates via JobEventSideEffectsService)]
  HC --> WS[WebSocket broadcasts via SubscriptionManager]
```

Steps:
1) AI worker publishes to topic exchange `jobs.events` with routing keys matching `job.#` (e.g., `job.resume.completed`).
2) Queue `jobs.events.bff` is bound to `jobs.events` with `job.#`, so all job events land there.
3) `JobCompletionHandler` consumes, JSON-parses message(s), ACKs after parsing, and dispatches side effects:
   - `JobEventSideEffectsService` updates DB/scoring depending on event type.
   - `JobEventsSubscriptionManager` broadcasts over WebSocket to any client subscribed to that jobId.

## Names and keys at a glance
- Submission exchange: `jobs.submission` (env `JOB_SUBMISSION_EXCHANGE`).
- Submission routing key: `job.submitted` (env `JOB_SUBMISSION_ROUTING_KEY`).
- Completed-events exchange: `jobs.events` (topic).
- Completed-events queue: `jobs.events.bff`.
- Binding key for completed events: `job.#`.
- Message types (body field): `resume.parsing`, `resume.tailoring`, `checklist.parsing`, `checklist.matching` (submissions) and `*.completed` variants, plus `failed`.

## Connection and lifecycle details
- Connection is created once at startup; there is a known TODO: if the connection drops, the channel stays dead until restart (no reconnect logic yet).
- Channel uses confirms (`waitForConfirms`) so publishes are durably accepted by the broker.
- Prefetch (default 5) limits unacked messages per consumer on this channel.
- Both exchanges and queues are asserted as durable; messages are persistent (`deliveryMode: 2`).

## How to extend
- New submission type: add a payload DTO + `enqueueX` in `QueueService` using the same exchange/routing key and include a new `messageType` constant.
- New completion event: have the worker publish to `jobs.events` with a `job.<something>` routing key; handle it in `JobEventSideEffectsService` and optionally broadcast via `JobEventsSubscriptionManager`.
- Different routing: adjust `JOB_SUBMISSION_EXCHANGE` / `JOB_SUBMISSION_ROUTING_KEY` envs (publisher) and bindings on the worker side to match.
