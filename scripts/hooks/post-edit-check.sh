#!/bin/bash
# scripts/hooks/post-edit-check.sh — PostToolUse Hook

FILE="${CLAUDE_TOOL_OUTPUT_FILE:-}"
[ -z "$FILE" ] && exit 0

# 只检查 TS/TSX/JS/JSX/CSS 文件
[[ "$FILE" =~ \.(ts|tsx|js|jsx|css)$ ]] || exit 0

# 检查硬编码颜色（排除 token 文件本身）
if [[ "$FILE" != *"tokens.json"* ]] && [[ "$FILE" != *"token-loader"* ]]; then
  if grep -nE '(#[0-9A-Fa-f]{6}|rgba?\([0-9]|rgb\()' "$FILE" &>/dev/null; then
    echo "⚠️  $FILE 中发现硬编码颜色，请替换为 CSS Token 变量"
  fi
fi

# 检查 Tool 函数缺少 ctx 参数
if [[ "$FILE" == server/domains/*/tools.ts ]]; then
  if grep -n "^export async function" "$FILE" | grep -v "ctx:" &>/dev/null; then
    echo "⚠️  $FILE 中有 Tool 函数缺少 ctx: RequestContext 参数"
  fi
fi

# 检查跨域 import
if [[ "$FILE" == server/domains/*/agent.ts ]] || [[ "$FILE" == server/domains/*/tools.ts ]]; then
  DOMAIN=$(echo "$FILE" | sed 's|server/domains/\([^/]*\)/.*|\1|')
  if grep -n "from '\.\./[^/]*/" "$FILE" | grep -v "../../shared" &>/dev/null; then
    echo "⚠️  $FILE 中可能存在跨域 import（当前域：$DOMAIN），请通过 Orchestrator 协调"
  fi
fi
