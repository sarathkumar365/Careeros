FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./

# install uv (the resolver/installer)
RUN pip install --no-cache-dir uv

# install project deps using the lockfile (project venv managed by uv)
RUN uv sync --frozen --no-dev

# production-friendly defaults
ENV PYTHONDONTWRITEBYTECODE=1 \
    UVICORN_RELOAD=0

COPY main.py ./

COPY ./src ./src

ENV PORT=8989

EXPOSE 8989

CMD ["uv" , "run" , "python" , "main.py"]
