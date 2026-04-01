import type { RequestContext } from '../shared/types';

export type ToolFn = (
  ctx: RequestContext,
  params: Record<string, unknown>
) => Promise<unknown>;

export interface ToolMeta {
  domain: string;
  description: string;
  fn: ToolFn;
}

// Domain tools register here after their domain module is initialised.
// Key format: "{domain}.{toolName}", e.g. "goals.getActiveGoals"
const registry = new Map<string, ToolMeta>();

export function registerTool(key: string, meta: ToolMeta): void {
  registry.set(key, meta);
}

export function getTool(key: string): ToolMeta | undefined {
  return registry.get(key);
}

export function listTools(): Array<{ key: string; domain: string; description: string }> {
  return Array.from(registry.entries()).map(([key, { domain, description }]) => ({
    key,
    domain,
    description,
  }));
}
