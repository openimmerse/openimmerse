

# OpenImmerse - AI 原生沉浸式翻译插件 (MVP 优化版)

## 1. 核心差异化策略 (Optimization Strategy)

| 功能点 | 旧版 (Old Immersive) | OpenImmerse (本项目) | 优化理由 |
| :--- | :--- | :--- | :--- |
| **翻译引擎** | 聚合所有引擎 (Google, Bing, DeepL等) | **专注 OpenAI 兼容接口** (OpenAI, DeepSeek, Claude, Ollama) | 降低代码复杂度，专注 AI 语义理解能力，方便用户自定义。 |
| **触发机制** | 页面加载后自动/手动全页翻译 | **懒加载 (IntersectionObserver)** | **核心优化**：仅翻译用户屏幕可见区域的段落。节省 Token，防止 API 速率限制 (429 Error)。 |
| **翻译粒度** | 复杂的网站规则库 (Rule-based) | **通用启发式算法 + AI 修正** | 减少维护特定网站规则的成本，依靠 AI 的容错性处理 HTML 结构。 |
| **缓存机制** | 简单的 LocalStorage | **IndexedDB + 语义指纹** | AI 翻译较慢且贵，必须建立强大的本地缓存，避免重复翻译同一段话。 |

---

## 2. 技术架构 (Technical Architecture)

*   **Core:** React + TypeScript + Vite
*   **Extension Std:** **Manifest V3** (必须)
*   **State:** Zustand (全局状态) + RxJS (处理复杂的流式数据流)
*   **UI:** Shadow DOM (隔离) + Tailwind CSS
*   **Storage:** `chrome.storage.local` (配置) + `IndexedDB` (翻译缓存)

---

## 3. MVP 功能模块详解

### 3.1 配置中心 (Config Hub) - 用户诉求核心
支持“一键配置，任意模型”。

*   **界面设计**：提供一个简洁的表单。
    *   `Provider`: 下拉选择 (OpenAI / DeepSeek / Azure / Custom / Ollama)
    *   `API Base URL`: 默认为官方地址，允许修改（方便代理或本地模型）。
    *   `API Key`: 密码框显示。
    *   `Model Name`: 比如 `deepseek-chat`, `gpt-4-turbo`.
    *   `Concurrency`: 并发数设置（默认为 3，防止 429）。
*   **Prompt 自定义**：
    *   提供默认 Prompt：“你是一个翻译插件，直接输出翻译后的文本，不要解释。”
    *   允许用户改为：“你是一个技术专家，翻译成中文，并解释其中的技术术语。”（AI 的优势）。

### 3.2 智能网页内容解析 (Dom Parser)
参考旧版，但做减法。

*   **块级元素识别**：
    *   核心算法：遍历 DOM，筛选包含文本长度 > N 的块级标签 (`P`, `H1-H6`, `LI`, `BLOCKQUOTE`, `TD`)。
    *   **黑名单机制**：自动跳过 `nav`, `script`, `style`, `code`, `footer` 等标签。
    *   **指纹生成**：对原文内容计算 Hash (MD5)，作为缓存的 Key。

### 3.3 可视区域流式翻译 (Lazy Streaming Translation)
这是针对 AI 模型的**最大优化**。

*   **逻辑流程**：
    1.  用户开启翻译。
    2.  插件在所有目标段落下方插入“占位符 DOM”（显示 loading 骨架屏）。
    3.  利用 `IntersectionObserver` 监听占位符。
    4.  当用户滚动页面，占位符进入屏幕可视区域时，**才**发起 API 请求。
    5.  **流式回填**：通过 SSE (Server-Sent Events) 接收数据，实时更新占位符内的文本，实现“打字机”效果。

### 3.4 划词/悬浮翻译 (Mouse Tooltip)
便捷小功能。

*   **交互**：
    *   监听 `mouseup` 事件。
    *   若选中文本长度 > 0，在鼠标位置显示“OpenImmerse 图标”。
    *   点击图标 -> 弹出 Shadow DOM 浮窗 -> 流式展示 AI 结果。
*   **AI 优势**：划词翻译不仅仅是翻译，可以在配置里设置为“解释这段代码”或“润色这段话”。
