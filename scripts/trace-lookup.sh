#!/bin/bash
# scripts/trace-lookup.sh
TRACE_ID=$1; LOG="${LOG_FILE:-logs/app.log}"
[ -z "$TRACE_ID" ] && echo "用法: ./scripts/trace-lookup.sh [traceId]" && exit 1
[ ! -f "$LOG" ] && echo "❌ 日志文件不存在: $LOG" && exit 1
echo "🔍 $TRACE_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v jq &>/dev/null; then
  grep "$TRACE_ID" "$LOG" | jq -r '[.timestamp[11:19], .level, .event, (if .duration then "(\(.duration)ms)" else "" end), (if .error then "ERR: \(.error)" else "" end)] | map(select(.!="")) | join("  ")'
else
  grep "$TRACE_ID" "$LOG"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$(grep -c "$TRACE_ID" "$LOG") 条记录"
