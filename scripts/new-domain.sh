#!/bin/bash
# scripts/new-domain.sh
# 用法: ./scripts/new-domain.sh [name] "[职责]"

NAME=$1; DESC=${2:-"待填写"}
DIR="server/domains/$NAME"
[ -z "$NAME" ] && echo "用法: ./scripts/new-domain.sh [name] \"[职责]\"" && exit 1
[ -d "$DIR" ] && echo "❌ $DIR 已存在" && exit 1

mkdir -p "$DIR"

cat > "$DIR/README.md" << EOF
# Domain: $NAME
**职责**：$DESC
**DB 前缀**：${NAME}_*

## 属于本域
- [ ] 填写

## 不属于本域
- [ ] 填写（由哪个域负责）

## 对外 Tools
见 docs/DOMAIN_CONTRACTS.md → $NAME 章节
EOF

cat > "$DIR/types.ts" << EOF
// Domain: $NAME — 私有类型（跨域共享类型放 server/shared/types.ts）

export interface ${NAME^}Entity {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
EOF

cat > "$DIR/repository.ts" << EOF
// Domain: $NAME — 只访问 ${NAME}_* 前缀的表
import type { RequestContext } from '../../shared/types';

export class ${NAME^}Repository {
  constructor(private ctx: RequestContext) {}
  // TODO: 添加数据库操作方法
}
EOF

cat > "$DIR/tools.ts" << EOF
// Domain: $NAME — Dumb Tool 层（无判断、无副作用链、单一职责）
import type { RequestContext } from '../../shared/types';

export async function example${NAME^}Action(
  ctx: RequestContext,
  params: { userId: string }
): Promise<{ success: boolean }> {
  ctx.log('tool.example${NAME^}Action', { params });
  // TODO: 实现逻辑
  return { success: true };
}
EOF

cat > "$DIR/agent.ts" << EOF
// Domain: $NAME — Smart Agent（system prompt + tool 注册）
import * as tools from './tools';

export const systemPrompt = \`
你是 $NAME 领域专家。
职责：$DESC

不负责：[填写边界，超出范围返回 {needsOrchestrator: true, reason: "..."}]

可用工具：\${Object.keys(tools).join(', ')}
\`;

export { tools };
EOF

chmod +x scripts/new-domain.sh 2>/dev/null || true
echo "✅ Domain '$NAME' 创建完成"
echo "下一步：填写 README.md → DOMAIN_CONTRACTS.md → types → repo → tools → agent → toolRegistry"
