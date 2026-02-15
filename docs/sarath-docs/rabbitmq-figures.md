# RabbitMQ Architecture Figures

## Publisher/Submission Path (BFF ➜ RabbitMQ ➜ AI Workers)
```mermaid
flowchart LR
  FE[Frontend] -->|POST /jobs| BFF[JobApplicationService]
  BFF --> QSvc[QueueService]
  QSvc -->|resume.parsing & checklist.parsing| SUBEX[jobs.submission exchange]
  SUBEX -->|routing job.submitted| WQ1[worker queue]
  SUBEX -->|routing job.submitted| WQ2[worker queue]
  WQ1 --> AI1[AI worker]
  WQ2 --> AI2[AI worker]
```

## Completion/Events Path (AI Workers ➜ RabbitMQ ➜ BFF ➜ WebSocket)
```mermaid
flowchart LR
  AI[AI worker] -->|job.resume.*.completed| EVEX[jobs.events exchange]
  EVEX -->|binding job.#| BFFQ[jobs.events.bff queue]
  BFFQ --> HC[JobCompletionHandler]
  HC --> SE[DB updates / scoring]
  HC --> WS[WebSocket clients]
```

## Connection & Channel Setup
```mermaid
flowchart LR
  ENV[RABBITMQ_URL / RABBITMQ_PREFETCH] --> RMQMod[RabbitMqModule]
  RMQMod --> Conn[RabbitMQ connection]
  Conn --> Chan[Confirm channel prefetch=N]
  Chan --> QSvc[QueueService]
  Chan --> HC[JobCompletionHandler]
  Conn -. shutdown .-> close[(Graceful close)]
```

## End-to-End Topology (BFF → RabbitMQ ← AI)
```mermaid
flowchart LR
  subgraph BFF
    QPub[QueueService + JobApplicationService]
    QSub[JobCompletionHandler]
  end

  subgraph MQ
    SUBEX[jobs.submission exchange]
    EVEX[jobs.events exchange]
    WQ[job.submitted worker queue]
    BFFQ[jobs.events.bff queue]
  end

  subgraph AI
    AIW1[Worker consumes tasks]
    AIW2[Worker publishes completions]
  end

  QPub -->|resume.parsing + checklist.parsing| SUBEX
  SUBEX -->|binding job.submitted| WQ
  WQ --> AIW1
  AIW2 -->|job.resume.*.completed| EVEX
  EVEX -->|binding job.#| BFFQ
  BFFQ --> QSub
```
