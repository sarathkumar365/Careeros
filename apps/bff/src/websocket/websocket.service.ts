import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { FastifyRequest, FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { TaskResult } from '../types/task.types';

interface JobRouteParams {
  jobId?: string;
}

const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const WS_OPEN_STATE = 1;

function resolveIdleTimeoutMs(): number {
  const raw = process.env.WEBSOCKET_IDLE_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_IDLE_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_IDLE_TIMEOUT_MS;
  }

  return parsed;
}

/**
 * WebSocket service that handles both connection management and event broadcasting
 *
 * Responsibilities:
 * - Set up WebSocket routes
 * - Manage connection lifecycle (connect, timeout, disconnect)
 * - Track active connections per job application
 * - Broadcast task events to connected clients
 */
@Injectable()
export class WebSocketService implements OnModuleInit {
  private readonly logger = new Logger(WebSocketService.name);
  private fastify: FastifyInstance | null = null;
  private readonly connections = new Map<string, Set<WebSocket>>();
  private readonly socketTimeouts = new Map<WebSocket, NodeJS.Timeout>();
  private readonly idleTimeoutMs = resolveIdleTimeoutMs();
  //   new Map<string, Set<WebSocket>>();
  //             ↑      ↑           ↑
  //          jobId    Set of    WebSocket connections

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  /* ========================================================================
   * Route Setup & Connection Lifecycle
   * ======================================================================== */

  onModuleInit() {
    const httpAdapter = this.adapterHost.httpAdapter;
    if (!httpAdapter || httpAdapter.getType() !== 'fastify') {
      throw new Error('WebSocketService requires the Fastify adapter');
    }

    this.fastify = httpAdapter.getInstance<FastifyInstance>();

    // Register WebSocket route
    this.fastify.get(
      '/jobs/:jobId/events',
      { websocket: true },
      (socket: WebSocket, request) => this.handleConnection(socket, request),
    );
  }

  private handleConnection(socket: WebSocket, request: FastifyRequest) {
    const { jobId = 'unknown' } = request.params as JobRouteParams;

    this.logger.debug(`Client connected to ${jobId}`);

    let closed = false;

    // Register connection
    this.registerConnection(jobId, socket);
    this.resetIdleTimeout(socket, jobId);

    // Cleanup on close
    socket.on('close', () => {
      if (closed) return;
      closed = true;
      this.unregisterConnection(jobId, socket);
      this.clearIdleTimeout(socket);
      this.logger.debug(`Client disconnected from ${jobId}`);
    });
  }

  private resetIdleTimeout(socket: WebSocket, jobId: string): void {
    this.clearIdleTimeout(socket);

    const timeout = setTimeout(() => {
      if (socket.readyState === WS_OPEN_STATE) {
        this.logger.warn(
          `Closing idle websocket for ${jobId} after ${this.idleTimeoutMs / 1000}s timeout`,
        );
        socket.close();
      }
    }, this.idleTimeoutMs);

    this.socketTimeouts.set(socket, timeout);
  }

  private clearIdleTimeout(socket: WebSocket): void {
    const timeout = this.socketTimeouts.get(socket);
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    this.socketTimeouts.delete(socket);
  }

  /* ========================================================================
   * Connection Management
   * ======================================================================== */

  private registerConnection(jobId: string, socket: WebSocket): void {
    const sockets = this.connections.get(jobId) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.connections.set(jobId, sockets);
    this.logger.debug(
      `Registered connection for ${jobId} (total: ${sockets.size})`,
    );
  }

  private unregisterConnection(jobId: string, socket: WebSocket): void {
    const sockets = this.connections.get(jobId);
    if (!sockets) {
      return;
    }
    sockets.delete(socket);
    if (sockets.size === 0) {
      this.connections.delete(jobId);
    }
    this.logger.debug(
      `Unregistered connection for ${jobId} (remaining: ${sockets.size})`,
    );
  }

  /**
   * Clear all connections (used for cleanup/testing)
   */
  clear(): void {
    this.connections.clear();
  }

  /**
   * Broadcast a task event to all WebSocket connections watching a job application
   * Called by workflow service when task events occur
   *
   * @param jobId Job application ID to send event to
   * @param event Task event to broadcast
   */
  broadcast(jobId: string, event: TaskResult): void {
    const sockets = this.connections.get(jobId);
    if (!sockets || sockets.size === 0) {
      this.logger.debug(`No connections for ${jobId}`);
      return;
    }

    const message = JSON.stringify(event);
    for (const socket of sockets) {
      try {
        if (socket.readyState === WS_OPEN_STATE) {
          socket.send(message);
          this.resetIdleTimeout(socket, jobId);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to send to ${jobId}: ${(error as Error).message}`,
        );
      }
    }
  }
}
