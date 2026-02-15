# Applications (Web & BFF)

This directory contains the frontend (`web`) and Backend-for-Frontend (`bff`).

## Key Architectural Principles

- **Frontend Data Flow**: The frontend sends structured JSON data to the
  backend, not raw file objects.
- **Real-Time Preview**: The live preview feature compiles
  [Typst](https://typst.app/) code whenever changes are made.
- **Resume Templates**: Resume templates are generated programmatically using
  Typst.
- **Backend Schema Handling**: The backend processes template schemas as
  opaque JSON, without needing to understand their specific structure.

## Critical Notes

- **Message Queues**: **Do not modify existing queue types.** This will break
  the application. To add functionality, extend the system by creating new queue
  types.
- **Zod Version**: The frontend must use `Zod v3` to remain compatible with
  the `zod-to-json-schema` library.
