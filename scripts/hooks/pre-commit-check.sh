#!/bin/bash
# scripts/hooks/pre-commit-check.sh — PreToolUse Hook（git commit 前）

ERRORS=0
echo "🏗️  ForNow 架构守卫..."

# 硬编码颜色检查
HARDCODED=$(git diff --cached --name-only | grep -E '\.(ts|tsx|css)$' | \
  xargs grep -lnE '(#[0-9A-Fa-f]{6}|rgba?\()' 2>/dev/null | \
  grep -Ev '(tokens\.json|token-loader)' || true)
if [ -n "$HARDCODED" ]; then
  echo "❌ 硬编码颜色：$HARDCODED"
  ERRORS=$((ERRORS+1))
else echo "  ✅ Token 检查"; fi

# Tool ctx 参数检查
MISSING=$(git diff --cached --name-only | grep 'domains/.*/tools\.ts' | \
  xargs grep -ln "^export async function" 2>/dev/null | \
  xargs grep -L "ctx:" 2>/dev/null || true)
if [ -n "$MISSING" ]; then
  echo "❌ Tool 缺少 ctx 参数：$MISSING"
  ERRORS=$((ERRORS+1))
else echo "  ✅ ctx 参数检查"; fi

# iOS 业务逻辑检查
IOS_LOGIC=$(git diff --cached --name-only | grep '\.swift$' | \
  xargs grep -lnE '(isPremium|\.role|businessLogic|apiCall)' 2>/dev/null || true)
if [ -n "$IOS_LOGIC" ]; then
  echo "⚠️  Swift 疑似含业务逻辑：$IOS_LOGIC"
else echo "  ✅ iOS 零逻辑检查"; fi

[ $ERRORS -gt 0 ] && echo "❌ $ERRORS 个错误，请修复后再提交" && exit 1
echo "✅ 所有检查通过" && exit 0
