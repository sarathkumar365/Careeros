FROM oven/bun:1.2

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the source (configs + code)
COPY . .

ARG VITE_BFF_URL
ENV VITE_BFF_URL=${VITE_BFF_URL}

# build the static site (VITE_BFF_URL should be set at build time)
RUN bun run build

ENV PORT=3000

EXPOSE 3000

# Serve the built app; `serve` runs `vite preview` per package.json
CMD ["bun", "run", "serve", "--", "--host", "0.0.0.0", "--port", "3000"]
