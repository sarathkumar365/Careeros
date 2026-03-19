/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { HttpAdapterHost } from '@nestjs/core';
import type { WebSocket } from '@fastify/websocket';
import type { FastifyRequest } from 'fastify';
import { WebSocketService } from './websocket.service';

class FakeSocket {
  readyState = 1;
  sent: string[] = [];
  closeCalls = 0;
  private closeHandler: (() => void) | null = null;

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.closeCalls += 1;
    this.readyState = 3;
    this.closeHandler?.();
  }

  on(event: string, callback: () => void): void {
    if (event === 'close') {
      this.closeHandler = callback;
    }
  }
}

type WsRouteHandler = (socket: WebSocket, request: FastifyRequest) => void;

function createService(): {
  service: WebSocketService;
  getRouteHandler: () => WsRouteHandler | null;
  authService: {
    resolveUserFromToken: jest.Mock;
  };
  database: {
    jobApplication: {
      findUnique: jest.Mock;
    };
  };
} {
  let routeHandler: WsRouteHandler | null = null;
  const getMock = jest.fn(
    (_path: string, _options: { websocket: true }, handler: WsRouteHandler) => {
      routeHandler = handler;
    },
  );

  const adapterHost = {
    httpAdapter: {
      getType: () => 'fastify',
      getInstance: () => ({
        get: getMock,
      }),
    },
  } as unknown as HttpAdapterHost;

  const authService = {
    resolveUserFromToken: jest
      .fn()
      .mockResolvedValue({ id: 'user-1', role: 'USER', email: 'u@e.com' }),
  };

  const database = {
    jobApplication: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'job-1', userId: 'user-1' }),
    },
  };

  const service = new WebSocketService(
    adapterHost,
    authService as any,
    database as any,
  );
  service.onModuleInit();

  return {
    service,
    getRouteHandler: () => routeHandler,
    authService,
    database,
  };
}

async function connectSocket(
  getRouteHandler: () => WsRouteHandler | null,
  jobId: string,
  requestOverrides?: Partial<FastifyRequest>,
): Promise<FakeSocket> {
  const routeHandler = getRouteHandler();
  expect(routeHandler).not.toBeNull();
  if (!routeHandler) {
    throw new Error('WebSocket route handler was not registered');
  }

  const fakeSocket = new FakeSocket();
  const socket = fakeSocket as unknown as WebSocket;
  const request = {
    params: { jobId },
    cookies: { careeros_auth: 'token' },
    ...requestOverrides,
  } as unknown as FastifyRequest;

  routeHandler(socket, request);
  // Route handler is async; flush a few microtasks so auth/ownership checks
  // complete before assertions/timer advances.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  return fakeSocket;
}

describe('WebSocketService', () => {
  const originalEnv = process.env.WEBSOCKET_IDLE_TIMEOUT_MS;

  afterEach(() => {
    process.env.WEBSOCKET_IDLE_TIMEOUT_MS = originalEnv;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('uses env idle timeout when provided', async () => {
    process.env.WEBSOCKET_IDLE_TIMEOUT_MS = '45';
    jest.useFakeTimers();

    const { getRouteHandler } = createService();
    const fakeSocket = await connectSocket(getRouteHandler, 'job-1');

    jest.advanceTimersByTime(44);
    expect(fakeSocket.closeCalls).toBe(0);

    jest.advanceTimersByTime(1);
    expect(fakeSocket.closeCalls).toBe(1);
  });

  it('falls back to default timeout for invalid env value', async () => {
    process.env.WEBSOCKET_IDLE_TIMEOUT_MS = 'invalid';
    jest.useFakeTimers();

    const { getRouteHandler } = createService();
    const fakeSocket = await connectSocket(getRouteHandler, 'job-1');

    jest.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(fakeSocket.closeCalls).toBe(0);

    jest.advanceTimersByTime(1);
    expect(fakeSocket.closeCalls).toBe(1);
  });

  it('resets idle timeout after broadcast send', async () => {
    process.env.WEBSOCKET_IDLE_TIMEOUT_MS = '50';
    jest.useFakeTimers();

    const { service, getRouteHandler } = createService();
    const fakeSocket = await connectSocket(getRouteHandler, 'job-1');

    jest.advanceTimersByTime(30);
    service.broadcast('job-1', {
      type: 'score.updating.completed',
      jobId: 'job-1',
      matchPercentage: 80,
      timestamp: new Date().toISOString(),
    });

    expect(fakeSocket.closeCalls).toBe(0);

    jest.advanceTimersByTime(30);
    expect(fakeSocket.closeCalls).toBe(0);

    jest.advanceTimersByTime(30);
    expect(fakeSocket.closeCalls).toBe(1);
  });

  it('rejects websocket connection when cookie is missing', async () => {
    const { getRouteHandler } = createService();
    const fakeSocket = await connectSocket(getRouteHandler, 'job-1', {
      cookies: {},
    } as unknown as FastifyRequest);

    expect(fakeSocket.closeCalls).toBe(1);
  });

  it('rejects websocket connection when user cannot access job', async () => {
    const { getRouteHandler, database } = createService();
    database.jobApplication.findUnique.mockResolvedValueOnce({
      id: 'job-2',
      userId: 'other-user',
    });

    const fakeSocket = await connectSocket(getRouteHandler, 'job-2');
    expect(fakeSocket.closeCalls).toBe(1);
  });
});
