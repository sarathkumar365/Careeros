# Local Stack Debugging Helper (`local_start`)

Run the full stack (AI, BFF, Web) locally and tee output to the repo‐root `logs` file.

## Quick start
- Prereqs: Docker daemon running, RabbitMQ on `localhost:5672`, tools `uv`, `bun`, `python3`.
- To start RabitMQ, nav to services/infra/rabitmq and run `docker compose up` ( This is. a one time step and will continue running inyour local, unless you stop it manually)
- From repo root: `scripts/local/local_start`
- Override ports if needed: `PORT_WEB=8000 PORT_BFF=3001 PORT_AI=8989 scripts/local/local_start`
- Override frontend target (so the UI hits your BFF): `VITE_BFF_URL=http://localhost:3001`
- Stop gracefully: hit `Ctrl+C` in the terminal running the script; it traps and kills the children it started.

## Guide & debugging
**If you face any issues with ports (Already in use) :**
- **Check which ports are free:** `lsof -iTCP:3000 -sTCP:LISTEN` (repeat for 3001/3101/8980/8989/etc.).
- **See what the script started:** `ps -ef | grep "local_start"` and `ps -ef | grep "bun run"` / `ps -ef | grep "uv run python main.py"`.
- **Kill stragglers:** `pkill -f "uv run python main.py"` (AI), `pkill -f "bun run start:dev"` (BFF), `pkill -f "bun run dev -- --port"` (Web), or `pkill -f "scripts/local/local_start"` to stop old wrappers.
- **When ports keep reassigning:** Vite auto-increments if a port is busy. Free the port or pick a different `PORT_WEB` and set `VITE_BFF_URL` to the BFF port you chose.
- **Address already in use (AI):** Usually leftover `uvicorn`/AI processes. Find with `ps` above or `lsof -iTCP:8989 -sTCP:LISTEN`, then kill and rerun.
- **Logs:** Everything is appended to `logs` at the repo root; tail with `tail -f logs`.

## Common causes and fixes
- **BFF and Web on same port:** Vite fell back to BFF’s port because the requested web port was busy. Free the original port or run with distinct ports (e.g., `PORT_WEB=8000 PORT_BFF=3101` and `VITE_BFF_URL=http://localhost:3101`).
- **Frontend calling `http://bff:3001`:** `apps/web/.env` sets `VITE_BFF_URL=http://bff:3001` for containers. Override to `http://localhost:<bff-port>` for local dev.
- **Hanging on shutdown:** Old `local_start`/`bun`/`uv run` processes still running (tmux/background). Kill them with the `pkill` commands above, then restart.
