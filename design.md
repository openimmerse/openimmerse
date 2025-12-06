

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
*   **操作按钮**：翻译完成后显示"复制译文"和"朗读"按钮。

### 3.5 翻译显示模式 (Display Modes)
支持多种翻译结果展示方式。

*   **双语对照** (`bilingual`)：原文和译文上下排列，带标签标识。
*   **仅译文** (`replace`)：直接替换原文为译文。
*   **悬浮显示** (`hover`)：鼠标悬停时显示译文。

### 3.6 网站规则系统 (Site Rules)
灵活的网站级别配置。

*   **黑名单/白名单**：通过 URL 模式匹配，支持 `*` 通配符。
*   **右键菜单**：快速禁用当前网站翻译或切换翻译状态。
*   **预设规则**：自动跳过翻译网站（Google Translate、DeepL 等）。

### 3.7 翻译统计 (Translation Stats)
追踪翻译使用情况。

*   **总体统计**：翻译次数、字符数、缓存命中次数。
*   **每日统计**：最近 7 天的翻译趋势图。
*   **缓存管理**：查看缓存条目数，一键清除。

### 3.8 智能 DOM 解析 (Smart DOM Parser)
针对不同网站的优化解析。

*   **网站特定选择器**：GitHub、Medium、Twitter、Reddit、StackOverflow 等。
*   **语言检测**：根据目标语言智能判断是否需要翻译。
*   **优先级排序**：主要内容优先翻译，侧边栏/导航等低优先级。

---

## 4. 快捷键支持

| 快捷键 | 功能 |
| :--- | :--- |
| `Alt + T` | 开启/关闭页面翻译 |

---

## 5. 右键菜单

*   **翻译选中文本**：选中文本后右键翻译。
*   **切换当前网站翻译**：快速切换网站翻译状态。
*   **禁用此网站翻译**：将当前网站加入黑名单.
