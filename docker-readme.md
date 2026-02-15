| Env Var          | Service      | Purpose                                                                                                                                                   |
|------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| DATABASE_URL     | BFF 🔗       | Connection string for Postgres (Prisma).                                                                                                                  |
| RABBITMQ_URL     | BFF, AI 🤖   | Connection string for RabbitMQ messaging.                                                                                                                 |
| OPENAI_API_KEY   | AI 🤖        | Secure key for the external OpenAI API.                                                                                                                   |
| CORS_ORIGIN      | BFF 🔗       | The full URL of your deployed frontend (e.g., https://your-app.com). This ensures only your frontend can talk to your BFF, preventing cross-site request forgery attacks. |
| VITE_BFF_URL     | Web 🌐       | The path used by the frontend to talk to the BFF, which will be /api thanks to the reverse proxy (more on this in section 4).                             |
| JOB_SUBMISSION_* | BFF 🔗       | Internal configuration variables for defining queue names or job parameters in your NestJS app.                                                            |
