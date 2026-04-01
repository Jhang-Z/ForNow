// bridge/native.ts
// JS → Native 桥接底层调用封装
// 在 WebView 外（浏览器开发环境）自动降级为 mock

declare global {
  interface Window {
    webkit?: {
      messageHandlers: Record<string, { postMessage: (body: unknown) => void }>;
    };
    __bridgeResolve: (callId: string, data: unknown) => void;
    __bridgeReject: (callId: string, error: string) => void;
  }
}

const pendingCalls = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

// 注入全局回调，Swift 调用 window.__bridgeResolve / __bridgeReject
window.__bridgeResolve = (callId: string, data: unknown) => {
  pendingCalls.get(callId)?.resolve(data);
  pendingCalls.delete(callId);
};
window.__bridgeReject = (callId: string, error: string) => {
  pendingCalls.get(callId)?.reject(new Error(error));
  pendingCalls.delete(callId);
};

export function isNativeEnv(): boolean {
  return !!window.webkit?.messageHandlers;
}

export function callNative<T>(bridge: string, payload: Record<string, unknown>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const callId = `${bridge}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    pendingCalls.set(callId, {
      resolve: (v) => resolve(v as T),
      reject,
    });

    const handler = window.webkit?.messageHandlers[bridge];
    if (!handler) {
      // 非原生环境，3秒后超时（dev 期间用 mock 兜底）
      setTimeout(() => {
        if (pendingCalls.has(callId)) {
          pendingCalls.delete(callId);
          reject(new Error(`Bridge "${bridge}" not available (non-native env)`));
        }
      }, 3000);
      return;
    }

    handler.postMessage({ callId, ...payload });
  });
}
