/**
 * BullMQ queue configuration - Redis connection and queue setup.
 */

import IORedis from "ioredis";
import { Queue } from "bullmq";
import { logger } from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string): { host: string; port: number } {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || "localhost",
      port: u.port ? Number(u.port) : 6379,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });
    connection.on("error", (err) => {
      logger.error({ err: String(err) }, "[Queue] Redis connection error");
    });
    connection.on("connect", () => {
      logger.info("[Queue] Redis connected");
    });
  }
  return connection;
}

const defaultJobOptions = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
};

export const queueConfig = {
  connection: parseRedisUrl(REDIS_URL) as { host: string; port: number },
  defaultJobOptions,
};

export function createQueue<T = unknown>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: queueConfig.connection,
    defaultJobOptions,
  });
}

export function isQueueEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}
