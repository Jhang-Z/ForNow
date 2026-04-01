export interface RequestContext {
  traceId: string;
  userId: string;
  startTime: number;
  log(event: string, data?: Record<string, unknown>): void;
  logWarn(event: string, data?: Record<string, unknown>): void;
  logError(event: string, error: Error, data?: Record<string, unknown>): void;
}

export interface InstructionPayload {
  traceId: string;
  version: '1.0';
  screen?: {
    type: 'render' | 'update' | 'loading' | 'error';
    component: string;
    props: Record<string, unknown>;
  };
  toast?: {
    message: string;
    style: 'info' | 'success' | 'warning' | 'error';
    duration: number;
  };
  haptic?: {
    style: 'light' | 'medium' | 'heavy' | 'success' | 'error';
  };
  navigate?: {
    route: string;
    params?: Record<string, unknown>;
    transition?: 'push' | 'modal' | 'replace';
  };
}
