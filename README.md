# ForNow

> 把"目标感"做成能看见、能推进、能沉浸的 iOS App

## 架构

```
iOS（SwiftUI 壳 + WKWebView）← Instruction Payload → Server（Node.js）← → WebUI（React）
```

## 目录结构

```
ios/ForNow/       ← Xcode 项目
server/           ← Node.js + TypeScript 后端
webui/            ← React UI（运行在 WebView 里）
.claude/          ← Claude 规则文件（settings.json + rules/）
scripts/          ← 开发脚本
docs/             ← 架构文档
```

## 初始化步骤

### 1. 迁移 Xcode 项目（如果还没做）

```bash
# 在项目根目录执行
mkdir -p ios/ForNow
mv ForNow.xcodeproj ios/ForNow/
mv ForNow ios/ForNow/ForNow   # Swift 源码文件夹
# 然后用 Xcode 打开 ios/ForNow/ForNow.xcodeproj
```

### 2. 配置全局 Claude 规则

```bash
mkdir -p ~/.claude
cp GLOBAL_CLAUDE.md ~/.claude/CLAUDE.md
```

### 3. 初始化后端

```bash
cd server
npm init -y
npm install typescript ts-node @types/node
npm install express @anthropic-ai/sdk drizzle-orm better-sqlite3
```

### 4. 初始化 WebUI

```bash
cd webui
npm create vite@latest . -- --template react-ts
npm install
```

### 5. 赋予脚本执行权限

```bash
chmod +x scripts/*.sh scripts/hooks/*.sh
```

### 6. 开始开发

```bash
# 告诉 Claude：
# "我准备好了，帮我改造 SwiftUI 入口为 WKWebView 容器"
```

## Claude 使用说明

`.claude/` 文件夹里的规则每轮对话自动加载。

常用指令：
- `新增领域 [name]` — 生成 domain 脚手架
- `排查 tr_XXXXXX` — 根据 traceId debug
- `并行任务` — 启动并行 subagent
