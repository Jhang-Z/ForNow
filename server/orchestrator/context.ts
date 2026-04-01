// Re-export from observability so orchestrator imports stay within the orchestrator boundary.
// All context creation logic lives in observability/trace.ts.
export { createContext } from '../observability/trace';
export type { RequestContext } from '../shared/types';
