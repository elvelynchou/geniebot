# 隐身浏览器 Agent (Stealth Browser) 设计文档

## 1. 项目背景
本 Agent 旨在提供一个高对抗性的浏览器自动化环境，基于 `stealth-browser-mcp` (nodriver) 的核心能力开发。
**核心目标**：绕过 Cloudflare、Akamai 等反爬虫防御，同时支持多账号（Profile）的持久化管理。

## 2. 功能需求

### 2.1 隐身浏览 (Stealth Mode)
- **底层技术**：使用 `nodriver` (基于 Chrome DevTools Protocol)。
- **特征抹除**：自动隐藏 `navigator.webdriver` 等自动化指纹，模拟真实用户行为。

### 2.2 Profile 智能管理 (核心特性)
- **隔离存储**：所有浏览器数据（Cookies, Cache, LocalStorage）存储在 `profiles/<profile_name>` 目录下。
- **默认策略**：未指定 Profile 时，默认使用 `profiles/default`。
- **自动初始化与人工介入**：
    - 当用户指定一个**不存在**的 Profile 名称时，Agent 判定为“新号注册/登录”模式。
    - **动作**：启动带 GUI 的 Chrome 窗口 -> 暂停脚本 -> 提示用户手动操作（扫码/登录） -> 用户确认后关闭并保存状态。
    - **后续使用**：下次调用该 Profile 时，直接加载已保存的状态，无需再次登录。

### 2.3 指令驱动系统 (Playbook)
- Agent 不硬编码业务逻辑，而是作为一个**执行器**。
- **输入**：接受 JSON 格式的任务列表。
- **支持动作**：
    - `goto`: 导航到 URL。
    - `wait`: 等待指定秒数。
    - `click`: 点击元素 (CSS Selector)。
    - `type`: 输入文本。
    - `snapshot`: 页面截图。
    - `dump`: 提取页面 HTML。

## 3. 系统架构

### 3.1 目录结构
```text
stealth_browser/
├── GEMINI.md           # AI 上下文索引
├── README_CN.md        # 本文档
├── activity_log.md     # 运行日志
├── requirements.txt    # 依赖列表
├── src/
│   ├── main.py         # 入口与调度器
│   └── browser_ops.py  # nodriver 封装层
├── profiles/           # 数据存储区 (.gitignore 忽略内容，但保留目录结构)
│   ├── default/
│   └── ...
└── venv/               # 虚拟环境
```

### 3.2 关键逻辑流程
1.  **启动**: 解析 CLI 参数 (`--profile`, `--task`).
2.  **Profile 检查**:
    - 检查 `./profiles/{name}` 是否存在。
    - 不存在 -> 触发 `Interactive Setup` 流程。
3.  **浏览器初始化**: 使用 `nodriver.start()` 挂载对应的 User Data Dir。
4.  **任务执行**: 遍历 JSON Task 列表，映射到 `nodriver` 的 API 调用。
5.  **资源释放**: 关闭浏览器进程，回写日志。

## 4. 变更日志
- **2026-01-28**: 项目初始化，定义目录结构与核心文档。
