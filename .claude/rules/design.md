# .claude/rules/design.md
# ForNow 设计体系 — 视觉风格 + Token 规范 + 组件约定

---

## ForNow 视觉身份

**核心感受**：沉浸、清醒、有力量感。不是普通 Todo App 的"清单感"，而是"我在推进一件重要的事"。

**设计参考**：
- 布局密度：参考 Linear（克制、信息密度高）
- 专注态：参考 Forest / Endel（全屏沉浸，极简）
- 目标感：参考 Notion + Superhuman（每个条目都值得认真对待）

**色调**：深色优先（目标感/专注感），浅色为辅。主色用暖白或纯白，强调色用温暖的琥珀/橙色系（代表"推进"、"燃烧"），避免冷蓝色系。

---

## Token 使用铁律

```css
/* ✅ 正确 */
.goal-card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacing-md) var(--spacing-lg);
  color: var(--color-text-primary);
}

/* ❌ 禁止 — 写了就必须重构 */
.goal-card {
  background: #1C1C1E;
  border-radius: 16px;
  padding: 16px 24px;
}
```

---

## ForNow Token 速查

```css
/* 主色 — 强调、CTA、进度 */
--color-primary          /* 琥珀/橙色，"推进"感 */
--color-primary-glow     /* 主色的发光版，用于专注模式 */

/* 背景层次（深色模式为主） */
--color-bg-base          /* 最底层：纯黑 #0A0A0A */
--color-bg-raised        /* 卡片层：#1C1C1E */
--color-bg-overlay       /* 浮层：#2C2C2E */

/* 文字 */
--color-text-primary     /* 白色系 */
--color-text-secondary   /* 灰白，次要信息 */
--color-text-muted       /* 更淡，时间戳/标签 */

/* 状态色 */
--color-success          /* 完成 */
--color-danger           /* 删除/警告 */
--color-focus            /* 专注中：特殊状态色 */

/* 间距（4px 基础） */
--spacing-xs: 4px   --spacing-sm: 8px   --spacing-md: 16px
--spacing-lg: 24px  --spacing-xl: 40px

/* 圆角 */
--radius-sm: 8px    --radius-md: 12px   --radius-card: 16px
--radius-pill: 999px

/* 动画 */
--duration-fast: 150ms   --duration-normal: 280ms   --duration-slow: 450ms
--easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
--easing-ios: cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

---

## ForNow 核心页面布局规范

### 目标列表页（Goals List）
参考 Linear Issue List：
- 每个目标卡片行高 72pt
- 左侧：状态圆圈（空/进行中/完成）
- 中间：目标标题（headline）+ 副标题（进度百分比，footnote）
- 右侧：截止日期 tag

### 专注模式页（Focus Mode）
全屏沉浸，参考 Forest：
- 背景：纯黑或极深渐变
- 中心：大计时数字（96px，monospace）
- 当前任务名：白色，title-2
- 底部：结束按钮（最小化，不抢焦点）
- 无任何导航栏、标签栏

### 目标详情页（Goal Detail）
参考 Notion Page：
- 顶部：目标标题（large-title）
- 进度条：全宽，primary 色
- 任务列表：每项 44pt 行高，可滑动完成

---

## 组件规范

### GoalCard（目标卡片）
```css
行高：72pt
内边距：水平 16px
状态指示器：16×16pt 圆圈，左侧 16px
标题：--text-headline-* 
进度：--color-text-muted，footnote
分隔线：0.5px，仅左侧缩进，不跨全宽
```

### FocusTimer（专注计时器）
```css
数字：font-size: 96px; font-weight: 200; font-variant-numeric: tabular-nums; letter-spacing: -4px;
颜色：--color-text-primary（正常）→ --color-primary-glow（最后30秒警告）
```

### TaskRow（任务行）
```css
最小高度：44pt
完成动画：checkbox → 勾选 → 文字淡出+删除线，200ms spring
```

---

## Dark Mode（默认）

ForNow 深色优先。浅色模式为可选：

```css
/* 默认就是深色，tokens.json 里的 base 值就是深色 */
/* 浅色模式覆盖 */
@media (prefers-color-scheme: light) {
  :root {
    --color-bg-base:   #F2F2F7;
    --color-bg-raised: #FFFFFF;
    --color-text-primary: #000000;
  }
}
```
