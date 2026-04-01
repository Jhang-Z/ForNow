# .claude/rules/architecture.md
# ForNow 架构约束 — SwiftUI 壳 + WebView + Node.js 后端

---

## Monorepo 目录结构

```
ForNow/                          ← Git 根目录（也是 Xcode workspace 位置）
│
├── CLAUDE.md                    ← 项目规则（每轮自动加载）
├── CLAUDE.local.md              ← 本地私有备注（gitignore）
├── .claude/
│   ├── settings.json            ← 权限配置（一次配好永不点允许）
│   ├── rules/                   ← 模块化规则文件
│   │   ├── architecture.md
│   │   ├── agent.md
│   │   ├── observability.md
│   │   ├── design.md
│   │   └── workflow.md
│   └── hooks/                   ← Claude hook 脚本（备用）
│
├── ios/                         ← iOS 薄客户端
│   └── ForNow/                  ← Xcode 项目（ForNow.xcodeproj 放这里）
│       ├── ForNow.xcodeproj
│       ├── ForNow/              ← Swift 源码
│       │   ├── App/
│       │   │   ├── ForNowApp.swift      ← App 入口
│       │   │   └── ContentView.swift   ← WKWebView 容器（唯一的 View）
│       │   ├── Bridge/
│       │   │   ├── BridgeHandler.swift ← 原生能力桥接注册
│       │   │   └── BridgeRouter.swift  ← 消息分发
│       │   └── Config/
│       │       └── AppConfig.swift     ← 服务端地址等配置
│       └── ForNowTests/
│
├── server/                      ← Node.js + TypeScript 后端
│   ├── package.json
│   ├── tsconfig.json
│   ├── orchestrator/
│   │   ├── planner.ts           ← 生成 ExecutionPlan JSON
│   │   ├── executor.ts          ← 按计划调用 Domain Tools
│   │   ├── toolRegistry.ts      ← 注册所有 Domain Tools
│   │   └── context.ts           ← RequestContext / TraceId
│   ├── domains/
│   │   ├── goals/               ← 目标管理（核心域）
│   │   ├── tasks/               ← 任务管理
│   │   ├── focus/               ← 专注模式
│   │   ├── progress/            ← 进度追踪
│   │   └── user/                ← 用户偏好
│   ├── shared/
│   │   ├── types.ts             ← 跨域共享 DTO / Event 类型
│   │   └── errors.ts            ← 统一错误类型
│   └── observability/
│       ├── logger.ts            ← 结构化日志（JSON）
│       └── trace.ts             ← TraceId 生成与传播
│
├── webui/                       ← React Web UI（运行在 WebView 里）
│   ├── package.json
│   ├── vite.config.ts
│   ├── tokens/
│   │   ├── tokens.json          ← 设计 Token 唯一来源
│   │   └── token-loader.ts      ← 启动时注入 CSS 变量
│   ├── bridge/
│   │   └── native.ts            ← JS → Native 桥接调用封装
│   ├── components/              ← UI 组件（只引用 token 变量）
│   └── pages/                   ← 页面（接收服务端指令渲染）
│
├── docs/
│   ├── DOMAIN_CONTRACTS.md      ← 各 Domain 对外 Tool 契约
│   └── TRACE_GUIDE.md           ← TraceId debug 使用指南
│
└── scripts/
    ├── hooks/
    │   ├── inject-context.sh    ← UserPromptSubmit hook（自动注入上下文）
    │   ├── post-edit-check.sh   ← PostToolUse hook（lint 检查）
    │   └── pre-commit-check.sh  ← PreToolUse hook（架构守卫）
    ├── new-domain.sh            ← 一键新增 Domain 脚手架
    └── trace-lookup.sh          ← 根据 traceId 查日志
```

---

## ⚠️ 关于 Xcode 项目位置

**当前情况**：Xcode 在 `ForNow/` 根目录创建了项目（`ForNow.xcodeproj` 在根目录）

**正确做法**：把 Xcode 项目移到 `ios/ForNow/` 里

**迁移步骤**（在终端执行）：
```bash
# 在 ForNow 根目录执行
mkdir -p ios/ForNow
# 把 Xcode 项目文件夹移进去（ForNow.xcodeproj 和 ForNow/ Swift 源码文件夹）
mv ForNow.xcodeproj ios/ForNow/
mv ForNow ios/ForNow/
# 用 Xcode 重新打开 ios/ForNow/ForNow.xcodeproj
```

---

## iOS 薄客户端规范

### ContentView.swift — 唯一的 View，只做 WebView 容器

```swift
import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        WebViewContainer()
            .ignoresSafeArea()
    }
}

struct WebViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        
        // 注册所有原生桥接
        BridgeHandler.register(config: config)
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false
        webView.scrollView.showsVerticalScrollIndicator = false
        
        // 加载本地 Web UI 或远端开发服务器
        #if DEBUG
        let url = URL(string: AppConfig.devServerURL)!
        webView.load(URLRequest(url: url))
        #else
        let url = Bundle.main.url(forResource: "index", withExtension: "html")!
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        #endif
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
```

### BridgeHandler.swift — 原生能力注册（只在这里写 Swift 逻辑）

```swift
import WebKit

class BridgeHandler: NSObject, WKScriptMessageHandler {
    
    static func register(config: WKWebViewConfiguration) {
        let handler = BridgeHandler()
        let bridges = ["haptic", "camera", "speech", "notification", "biometric", "clipboard", "share"]
        bridges.forEach { config.userContentController.add(handler, name: $0) }
    }
    
    func userContentController(_ controller: WKUserContentController,
                                didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let callId = body["callId"] as? String else { return }
        
        switch message.name {
        case "haptic":
            handleHaptic(body: body, callId: callId)
        case "camera":
            handleCamera(body: body, callId: callId)
        // ... 其他桥接
        default:
            break
        }
    }
    
    // ✅ 允许：原生能力封装
    private func handleHaptic(body: [String: Any], callId: String) {
        let style = body["style"] as? String ?? "medium"
        let generator: UIImpactFeedbackGenerator
        switch style {
        case "light":  generator = UIImpactFeedbackGenerator(style: .light)
        case "heavy":  generator = UIImpactFeedbackGenerator(style: .heavy)
        default:       generator = UIImpactFeedbackGenerator(style: .medium)
        }
        generator.impactOccurred()
        // callback JS（成功）
    }
}
```

### 禁止写在 Swift 里的代码

```swift
// ❌ 禁止：业务判断
if goal.isCompleted && task.priority == "high" { }
switch userPlan { case .premium: unlock() }

// ❌ 禁止：数据处理
let filtered = goals.filter { $0.deadline < Date() }

// ❌ 禁止：直接调用 API（由 WebView 里的 JS 调用）
URLSession.shared.dataTask(with: apiURL) { }
```

---

## 原生桥接能力清单

| Bridge Key | 说明 | 参数 |
|---|---|---|
| `haptic` | 触感反馈 | `{style: "light"\|"medium"\|"heavy"\|"success"\|"error"}` |
| `camera` | 相机/相册 | `{mode: "photo"\|"picker", maxCount?: number}` |
| `speech` | 语音识别 | `{action: "start"\|"stop"}` |
| `notification` | 本地通知 | `{title, body, delay: number}` |
| `biometric` | 生物识别 | `{reason: string}` |
| `clipboard` | 剪贴板 | `{action: "read"\|"write", value?: string}` |
| `share` | 系统分享 | `{text?: string, url?: string}` |

---

## Instruction Payload 协议（服务端 → iOS 的唯一数据格式）

```typescript
interface InstructionPayload {
  traceId: string;
  version: "1.0";
  screen?: {
    type: "render" | "update" | "loading" | "error";
    component: string;        // Web 组件名（对应 webui/pages/ 里的页面）
    props: Record<string, unknown>;
  };
  toast?:   { message: string; style: "info"|"success"|"warning"|"error"; duration: number };
  haptic?:  { style: "light"|"medium"|"heavy"|"success"|"error" };
  navigate?: { route: string; params?: Record<string, unknown>; transition?: "push"|"modal"|"replace" };
}
```
