#!/bin/bash
# scripts/hooks/inject-context.sh — UserPromptSubmit Hook
# 每次发消息自动注入上下文，stdout 内容会作为 additionalContext

OUT=""

# Git 状态
if git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  CHANGED=$(git diff --name-only HEAD 2>/dev/null | head -8)
  OUT+="**Git**: 分支 ${BRANCH}"
  [ -n "$CHANGED" ] && OUT+="\n已修改: $(echo "$CHANGED" | tr '\n' ' ')"
  OUT+="\n\n"
fi

# 最近错误（如有日志）
if [ -f "logs/app.log" ]; then
  ERRORS=$(tail -50 logs/app.log 2>/dev/null | grep '"level":"error"' | tail -2)
  [ -n "$ERRORS" ] && OUT+="**最近错误**:\n${ERRORS}\n\n"
fi

# 当前任务（从 CLAUDE.md 提取）
if [ -f "CLAUDE.md" ]; then
  TASK=$(awk '/## 当前任务状态/,/^---/' CLAUDE.md 2>/dev/null | head -12)
  [ -n "$TASK" ] && OUT+="${TASK}\n"
fi

[ -n "$OUT" ] && echo -e "---\n[自动上下文]\n${OUT}---"
