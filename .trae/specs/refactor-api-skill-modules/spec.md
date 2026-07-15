# akso-basic-config-api 功能块模块化拆分 Spec

## Why
当前 `akso-basic-config-api` 的所有 34 个函数全部挤在一个 `api-helpers.js`（348 行）中，形成了一个臃肿的单体文件。相比之下，`akso-basic-config`（DOM 版）已将不同功能块拆分为独立模块（login.js、create-object.js、create-field.js 等 11 个文件），架构清晰、易于复用和快速定位。API 版应学习并复用该架构，将功能块分离，便于快速启动和按需导入。

## What Changes
- **拆分 `api-helpers.js`** 为 9 个独立功能模块 + 1 个编排器模块 + 1 个统一入口（index.js）
- **明确三层依赖关系**：shared/browser-manager.js（公用浏览器生命周期）→ core.js（API 核心工具）→ 各功能模块
- **新增编排器模块** `orchestrate.js`：演示如何将多个 API 模块串联为完整配置工作流
- **更新 `SKILL.md`**：在每个模块对应的章节中嵌入可直接复制使用的代码示例（替代独立的 examples/*.md），新增模块速查表附录
- 每个模块文件含 JSDoc 注释示例 + `if (require.main === module)` 独立运行入口

## Impact
- Affected specs: 无（新 spec）
- Affected code/files:
  - `.trae/skills/akso-basic-config-api/scripts/api-helpers.js` — **BREAKING**：拆分为 9 个模块 + 编排器 + 入口，原文件删除
  - `.trae/skills/akso-basic-config-api/scripts/` — 新增 9 个功能模块 + orchestrate.js + index.js（共 11 个文件）
  - `.trae/skills/akso-basic-config-api/SKILL.md` — 更新文件结构说明 + 各章节嵌入代码示例 + 新增模块速查表附录
  - `.trae/skills/akso-basic-config-api/examples/full-workflow.md` — 更新引用方式
  - `shared/browser-manager.js` — 不变（已存在，各模块统一引用）

---

## ADDED Requirements

### Requirement: 三层依赖架构
系统 SHALL 将新模块体系组织为三层依赖关系，与 akso-basic-config（DOM 版）使用相同的 `shared/browser-manager.js`：

```
shared/browser-manager.js        ← 公用层（项目根，DOM/API 共用）
  ├── launchBrowser()            ← 启动浏览器
  ├── login(page, config)        ← DOM 登录（~3s）
  ├── closeBrowser(browser)      ← 关闭浏览器
  └── dismissAllPopups(page)     ← 弹窗消除
        ↓
scripts/core.js                  ← API 核心层（本 Skill）
  ├── apiPost(page, path, body)  ← POST 请求
  ├── apiGet(page, path)         ← GET 请求
  ├── getAuthToken(page)         ← 从 cookie 提取 JWT
  ├── isSuccess(resp)            ← 响应校验
  └── log(step, result)          ← 统一日志
        ↓
scripts/create-*.js              ← 功能模块层（本 Skill）
scripts/save-*.js                ← 每个模块导出纯函数，接受 page 参数
scripts/openapi-queries.js       ← 自带独立运行入口
scripts/orchestrate.js           ← 编排层：串联多个模块
```

#### Scenario: 功能模块的双重角色
- **GIVEN** `create-object.js` 被 `require` 导入
- **WHEN** 作为库函数调用 `createObject(page, { name, code })`
- **THEN** 仅执行 API 请求，不管理浏览器生命周期
- **WHEN** 作为独立脚本 `node scripts/create-object.js` 运行
- **THEN** 自动调用 shared/browser-manager.js → 启动浏览器 → 登录 → 执行 → 关闭浏览器

#### Scenario: 任何脚本都能独立运行验证
- **GIVEN** 开发者 clone 本项目后想验证字段创建 API 是否正常
- **WHEN** `node .trae/skills/akso-basic-config-api/scripts/create-field.js`
- **THEN** 自动完成：启动浏览器 → 登录 → 创建测试字段 → 输出结果 → 关闭浏览器
- **AND** 不需要额外编写任何入口代码

### Requirement: 功能块模块化拆分
系统 SHALL 将 `api-helpers.js` 中的 34 个函数按功能域拆分为以下 9 个独立模块 + 1 个编排器 + 1 个统一入口：

| 序号 | 文件名 | 功能域 | 导出函数 | 可独立运行 |
|------|--------|--------|----------|:----------:|
| 1 | `core.js` | 核心工具 | `apiPost`, `apiGet`, `getAuthToken`, `isSuccess`, `log`, `BASE`, `OPENAPI_BASE`, `ERROR_CODES` | — |
| 2 | `visibility.js` | 可视模式 | `enableVisibility`, `disableVisibility`, `isVisibilityOn` | ✅ |
| 3 | `create-object.js` | 对象创建 | `createObject` | ✅ |
| 4 | `create-field.js` | 字段创建 | `createField` + 14 个类型快捷函数 + `queryFields` | ✅ |
| 5 | `create-picklist.js` | 选项集创建 | `createPicklist` | ✅ |
| 6 | `save-form-layout.js` | 表单布局 | `saveFormLayout` | ✅ |
| 7 | `save-list-layout.js` | 列表布局 | `saveListLayout`, `addListColumns` | ✅ |
| 8 | `create-lifecycle-status.js` | 生命周期状态 | `createLifecycleStatus` | ✅ |
| 9 | `openapi-queries.js` | OpenAPI 查询 | `getOpenApiToken`, `getObjectInfo`, `getFieldList`, `getPicklistOptions`, `getLifecycleStatus` | ✅ |
| 10 | **`orchestrate.js`** | **编排器** | `runFullWorkflow(page, config)` — 串联登录→对象→字段→布局→验证 | ✅ |
| — | `index.js` | 统一入口 | 重新导出以上所有函数 + 独立演示模式 | ✅ |

#### Scenario: 开发者只需创建对象
- **GIVEN** 开发者只需使用对象创建功能
- **WHEN** `require('./scripts/create-object')`
- **THEN** 仅加载 `core.js` 和 `create-object.js` 两个模块
- **AND** 不会加载与字段/布局/生命周期相关的代码

### Requirement: 编排器模块（orchestrate.js）
系统 SHALL 新增 `scripts/orchestrate.js` 编排器模块，演示如何将多个功能模块串联为完整配置工作流。该模块：

- 导入 `shared/browser-manager.js` 管理浏览器生命周期（启动→登录→关闭）
- 按配置依赖顺序依次调用各功能模块：
  1. `login()` → 获取认证
  2. `createObject()` → 创建对象
  3. `getObjectInfo()` → 获取 objectId / lifecycleId
  4. `createPicklist()` → 创建选项集（如需要）
  5. `createField()` × N → 批量创建字段
  6. `saveFormLayout()` → 创建表单布局
  7. `saveListLayout() + addListColumns()` → 创建列表布局
  8. `createLifecycleStatus()` × N → 批量创建状态（如启用了生命周期）
  9. `getFieldList() + getLifecycleStatus()` → 验证结果
- 通过 `runFullWorkflow(page, config)` 导出函数，接受一个「配置蓝图」对象
- `if (require.main === module)` 独立运行时使用内置示例配置

#### Scenario: 编排器作为"一键配置"模板
- **GIVEN** 用户需要为一个新模块完成"对象→字段→布局→状态"的全链路配置
- **WHEN** Agent 阅读 `orchestrate.js` 的示例代码
- **THEN** 可以将 `blueprint` 对象替换为实际业务配置 → `node scripts/orchestrate.js` 一键执行

#### Scenario: 编排器的每一段都可独立注释掉
- **GIVEN** 用户只需要创建对象和字段，不需要布局
- **WHEN** 复制 orchestrate.js 到自己的脚本
- **THEN** 可以注释掉布局相关步骤，其余步骤顺序执行不受影响

### Requirement: 每个模块含 JSDoc 示例注释
系统 SHALL 在每个模块文件的顶部 JSDoc 注释中附带可直接复制使用的代码示例，明确展示 shared 层和 core 层的使用方式。

#### Scenario: 开发者打开 create-object.js 文件
- **GIVEN** 开发者第一次使用 API Skill
- **WHEN** 打开 `scripts/create-object.js`
- **THEN** 看到顶部 JSDoc 注释中有可复制运行的代码示例
- **AND** 示例展示了 shared/browser-manager.js 的导入和生命周期管理
- **AND** 可以直接 `node scripts/create-object.js` 运行验证

### Requirement: SKILL.md 各章节嵌入代码示例
系统 SHALL 在 `SKILL.md` 中每个功能模块对应的章节（对象创建、字段创建、选项集、表单布局、列表布局、生命周期）嵌入可直接复制使用的 Node.js 代码示例，替代独立的 `examples/*.md` 文件。

每个示例应遵循统一模板：
```javascript
// 导入公用层
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
// 导入功能模块
const { xxx } = require('./scripts/xxx');
// 浏览器生命周期
const { browser, page } = await launchBrowser();
await login(page, { baseUrl, username, password });
// 执行业务逻辑
const result = await xxx(page, { ... });
// 清理
await closeBrowser(browser);
```

#### Scenario: 用户读完"创建字段"章节后想立即试用
- **GIVEN** 用户阅读 SKILL.md 的「四、字段」章节
- **WHEN** 看到章节末尾的代码示例
- **THEN** 可以直接复制到新的 .js 文件中运行
- **AND** 不需要翻阅额外的 examples 目录

### Requirement: index.js 统一入口兼容旧调用方式
系统 SHALL 在 `index.js` 中重新导出所有 10 个模块的函数，保持与旧 `api-helpers.js` 完全相同的 `module.exports` 接口。

#### Scenario: 已有脚本 require api-helpers 不受影响
- **GIVEN** 已有编排脚本中引用了旧 api-helpers.js 的函数
- **WHEN** 将 require 路径从 `api-helpers` 改为 `index`
- **THEN** 所有函数名和签名与之前完全一致，执行结果相同

### Requirement: SKILL.md 文件结构和模块速查表更新
系统 SHALL 更新 `SKILL.md`：
- 顶部「文件结构」章节：反映新的 9 功能 + 1 编排器 + 1 入口，标注 shared/browser-manager.js 为公用层
- 新增「附录 E：API 模块速查表」：列出 11 个模块的文件名、功能、导出函数、`node` 运行方式
- 更新「第零章 执行架构」：添加三层架构说明和文件引用

---

## MODIFIED Requirements

### Requirement: full-workflow.md 更新导入方式
**Before**: `full-workflow.md` 中的示例代码演示将整个 `api-helpers.js` 注入浏览器（`window.__aksoAPI`）。

**After**:
- 新增基于 Node.js 直接 `require` 模块的调用方式（推荐），显式使用 `shared/browser-manager.js`
- 新增引用 `orchestrate.js` 编排器的一键执行方式
- 保留旧 browser_evaluate 注入方式作为备选

### Requirement: 删除旧 api-helpers.js
**Reason**: 旧单体文件被拆分为 11 个独立文件，不再需要。
**Migration**:
1. `require('./api-helpers')` → `require('./index')`
2. 按需导入 → `require('./create-object')` 等
