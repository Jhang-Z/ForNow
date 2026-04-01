import { logger } from './logger';
import type { RequestContext } from '../shared/types';

function generateTraceId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 8);
  return `tr_${date}_${random}`;
}

export function createContext(userId: string): RequestContext {
  const traceId = generateTraceId();
  const startTime = Date.now();

  return {
    traceId,
    userId,
    startTime,
    log: (event, data) =>
      logger.info({ traceId, userId, event, ...data }),
    logWarn: (event, data) =>
      logger.warn({ traceId, userId, event, ...data }),
    logError: (event, error, data) =>
      logger.error({ traceId, userId, event, error: error.message, ...data }),
  };
}
