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

  const service = new WebSocketService(adapterHost);
  service.onModuleInit();

  return {
    service,
    getRouteHandler: () => routeHandler,
  };
}

function connectSocket(
  getRouteHandler: () => WsRouteHandler | null,
  jobId: string,
): FakeSocket {
  const routeHandler = getRouteHandler();
  expect(routeHandler).not.toBeNull();
  if (!routeHandler) {
    throw new Error('WebSocket route handler was not registered');
  }

  const fakeSocket = new FakeSocket();
  const socket = fakeSocket as unknown as WebSocket;
  const request = {
    params: { jobId },
  } as unknown as FastifyRequest;

  routeHandler(socket, request);
  return fakeSocket;
}

describe('WebSocketService', () => {
  const originalEnv = process.env.WEBSOCKET_IDLE_TIMEOUT_MS;

  afterEach(() => {
    process.env.WEBSOCKET_IDLE_TIMEOUT_MS = originalEnv;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('uses env idle timeout when provided', () => {
    process.env.WEBSOCKET_IDLE_TIMEOUT_MS = '45';
    jest.useFakeTimers();

    const { getRouteHandler } = createService();
    const fakeSocket = connectSocket(getRouteHandler, 'job-1');

    jest.advanceTimersByTime(44);
    expect(fakeSocket.closeCalls).toBe(0);

    jest.advanceTimersByTime(1);
    expect(fakeSocket.closeCalls).toBe(1);
  });

  it('falls back to default timeout for invalid env value', () => {
    process.env.WEBSOCKET_IDLE_TIMEOUT_MS = 'invalid';
    jest.useFakeTimers();

    const { getRouteHandler } = createService();
    const fakeSocket = connectSocket(getRouteHandler, 'job-1');

    jest.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(fakeSocket.closeCalls).toBe(0);

    jest.advanceTimersByTime(1);
    expect(fakeSocket.closeCalls).toBe(1);
  });

  it('resets idle timeout after broadcast send', () => {
    process.env.WEBSOCKET_IDLE_TIMEOUT_MS = '50';
    jest.useFakeTimers();

    const { service, getRouteHandler } = createService();
    const fakeSocket = connectSocket(getRouteHandler, 'job-1');

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
});
