# AI Service

> [!NOTE]
> This services will likely be a container
> and there will another thin layer between AI worker and Redis.

FastAPI service for resume analysis (MVP).

## Setup

### Install uv (Python package manager)

> [!NOTE]
> with uv's project commands you don't need to activate the virtual environment

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with Homebrew
brew install uv

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Install dependencies

```bash
cd services/ai
uv sync
```

## Run

```bash
uv run python main.py
```

Server runs at: http://localhost:8989

## Code Quality

### Linting and Formatting

```bash
# Check for linting issues
uv run ruff check .

# Auto-fix linting issues
uv run ruff check --fix .

# Format code
uv run ruff format .

# Check + format in one go
uv run ruff check --fix . && uv run ruff format .
```

## Endpoints

- `GET /` - Service status
- `GET /health` - Health check
- `POST /api/analyze-file` - Upload PDF (placeholder)
- `POST /api/analyze-text` - Analyze text (placeholder)

## Dependencies

- FastAPI with Uvicorn
- PyPDF2 (for future PDF processing)
- Pydantic
- python-multipart (for file uploads)
- Ollama, Transformers (for future AI integration)

---

```bash
uv sync              # Install from uv.lock
uv add package       # Add new package
uv remove package    # Remove package
uv run script.py     # Run in project environment
uv lock              # Update uv.lock file
```
