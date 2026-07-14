# 三 Skill 统一 Playwright npm 包执行架构 Spec

## Why
当前三个 Skill 的脚本分散在三种 Playwright 执行方式中：
- `akso-basic-config/scripts/` 的 17 个 JS 文件：依赖 `playwright-cli run-code --filename`（CLI 托管模式）
- `login-one-shot.js`：依赖 MCP `browser_run_code_unsafe`（字符串 eval 模式）
- `akso-basic-config-api/scripts/api-helpers.js`：依赖 MCP `page.evaluate(fetch)`（Cookie → Bearer Token）

这三种方式的共同问题是：**浏览器生命周期不受脚本控制**，错误处理不完整，无法断点调试，且架构不统一。

而项目已有的 `tools/form-analyzer/index.js` 已证明：用 Playwright npm 包（`const { chromium } = require('playwright')`）直接管理浏览器是最稳定、可调试、可控的模式。

## What Changes

### 一、新增共享基础设施
- **新增 `shared/browser-manager.js`**：统一浏览器启动/关闭/登录/存储管理，所有三 Skill 的脚本共用
  - `launchBrowser()` → 返回 `{ browser, context, page }`
  - `login(page, { baseUrl, username, password })` → 登录并返回 `{ success, url }`
  - `closeBrowser(browser)` → 安全关闭

### 二、重构 akso-basic-config/scripts/（DOM 执行层）
- **改造所有 CLI 脚本为 npm 包脚本**：17 个 JS 文件全部从 `async (page) => {}` 改为独立的 Node.js 可执行模块，`require('../shared/browser-manager')`
- **淘汰 login-one-shot.js**：功能合并到 `login.js`
- **保留**：DOM 定位方式、操作步骤逻辑不变，仅改执行入口

### 三、重构 akso-basic-config-api/scripts/（API 执行层）
- **改造 api-helpers.js**：从 MCP `page.evaluate(fetch)` 模式改为 npm 包 `page.evaluate(fetch)` 模式，函数导出给 Node.js 调用
- **API token 获取方式**：不再依赖 `document.cookie` 提取，改用 Playwright 的 `page.context().cookies()` 获取

### 四、更新三个 SKILL.md 文档
- `akso-basic-config/SKILL.md`：执行入口从 "Playwright MCP 或 playwright-cli" 改为 "Playwright npm 包"
- `akso-basic-config-api/SKILL.md`：执行入口从 "browser_run_code_unsafe" 改为 "Playwright npm 包"
- `akso-gmp/SKILL.md`：协调架构中不再提及 MCP/CLI，统一为 npm 包方式

## Impact
- Affected specs: N/A（新 spec）
- Affected code/files:
  - `shared/browser-manager.js` — **新增**（共享浏览器管理）
  - `.trae/skills/akso-basic-config/scripts/*.js` — 17 个文件全部重构执行入口
  - `.trae/skills/akso-basic-config-api/scripts/api-helpers.js` — 重构执行入口
  - `.trae/skills/akso-basic-config/SKILL.md` — 修改执行入口说明 + 附录 D 调用示例
  - `.trae/skills/akso-basic-config-api/SKILL.md` — 修改执行入口说明
  - `.trae/skills/akso-gmp/SKILL.md` — 修改架构图中的执行方式描述
  - `.trae/skills/akso-basic-config/examples/*.md` — 4 个示例文件更新调用方式

---

## ADDED Requirements

### Requirement: 共享浏览器管理模块
系统 SHALL 提供 `shared/browser-manager.js`，包含浏览器启动、登录、关闭的公共函数，供所有三 Skill 的脚本引用。

#### Scenario: 启动浏览器
- **WHEN** 调用 `launchBrowser({ headless })`
- **THEN** 返回 `{ browser, context, page }` 三个 Playwright 对象

#### Scenario: 登录
- **WHEN** 调用 `login(page, { baseUrl, username, password })`
- **THEN** 自动完成导航→填表单→处理隐私弹窗→点击登录，返回 `{ success, url }`

#### Scenario: 安全关闭
- **WHEN** 调用 `closeBrowser(browser)`
- **THEN** 先 `context.close()` 再 `browser.close()`，无资源泄漏

### Requirement: DOM 脚本统一入口
系统 SHALL 确保 `akso-basic-config/scripts/` 下的所有脚本使用 `require('playwright')` 和 `require('../shared/browser-manager')`，不再依赖 `playwright-cli` 或 MCP。

#### Scenario: 登录脚本
- **WHEN** 用 `node login.js` 执行
- **THEN** 自动启动浏览器、登录、返回结果

#### Scenario: 创建对象脚本
- **WHEN** 用 `node create-object.js` 执行
- **THEN** 自动启动浏览器、登录、创建对象、返回 `{ success, objectId }`

### Requirement: API 脚本统一入口
系统 SHALL 确保 `akso-basic-config-api/scripts/api-helpers.js` 的函数通过 Playwright npm 包的 `page.evaluate()` 注入浏览器上下文执行，不再依赖 MCP `browser_run_code_unsafe`。

#### Scenario: API 调用
- **WHEN** 用 `node api-helpers.js` 执行
- **THEN** 自动启动浏览器、登录、通过 `page.evaluate(fetch)` 调用 API、返回结果

## MODIFIED Requirements

### Requirement: login-one-shot.js 淘汰
**Reason**: 其功能完全被 `login.js` 覆盖，且依赖 MCP 执行模型。
**Migration**: `login.js` 改为 npm 包模式后，同时支持"一发入魂"的快速登录场景（命令行参数指定账号密码即可）。

### Requirement: login.js 合并 login-one-shot.js 功能
`login.js` SHALL 支持两种使用方式：
1. 作为模块被 `require` 引入：`const { login } = require('./login')`
2. 作为独立脚本直接运行：`node login.js`（通过命令行参数或环境变量传入账号密码）

## REMOVED Requirements

### Requirement: playwright-cli 依赖
**Reason**: 统一为 Playwright npm 包后，不再需要 `playwright-cli` CLI 工具。
**Migration**: 所有 `playwright-cli run-code --filename` 命令改为 `node scripts/<name>.js`。

### Requirement: MCP browser_run_code_unsafe 依赖
**Reason**: `login-one-shot.js` 被淘汰，API 脚本改用 npm 包模式。
**Migration**: 所有 `browser_run_code_unsafe` 粘贴执行的场景改为 `node` 直接运行脚本。
