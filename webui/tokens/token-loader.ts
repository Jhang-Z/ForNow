import tokens from './tokens.json';

type TokenValue = string | number | Record<string, unknown>;

function flattenTokens(
  obj: Record<string, TokenValue>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;

    const varName = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'string' || typeof value === 'number') {
      result[varName] = String(value);
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(
        result,
        flattenTokens(value as Record<string, TokenValue>, varName)
      );
    }
  }

  return result;
}

export function injectTokens(): void {
  const flat = flattenTokens(tokens as Record<string, TokenValue>);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(flat)) {
    const cssVar = `--${key}`;
    // Append 'px' to pure numeric spacing/radius/shadow values that need units
    const needsUnit =
      key.startsWith('spacing') || key.startsWith('radius');
    root.style.setProperty(cssVar, needsUnit ? `${value}px` : value);
  }
}
