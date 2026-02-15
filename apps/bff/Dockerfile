FROM oven/bun:1.2

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the source (configs + code)
COPY . .
RUN bunx prisma generate
RUN bun run build

ENV PORT=3001

EXPOSE 3001

CMD ["bun", "run", "start:prod"]
