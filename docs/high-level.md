# Event Flow

There are 5 events in the backend

- resume.parsing
- checklist.parsing
- resume.tailoring
- checklist.matching
- score.updating

## Workflow

```txt
       inital upload
    ┌───────────────────┐
  ┌─┤ resume.parsing    ├─┐
  │ └───────────────────┘ │
async                     ├─┐
  │ ┌───────────────────┐ │ │
  └─┤ checklist.parsing ├─┘ │
    └───────────────────┘   │
                            │
         tailoring        async
    ┌───────────────────┐   │
    │ resume.tailoring  │   │
    └───────────┬───────┘   │
                │           │
                │           │
                │ ┌─────────▼─────────┐
                └►│checklist.matching │
                  └─────────┬─────────┘
                            ▼
                       score.updating
                          (NO AI)
```
