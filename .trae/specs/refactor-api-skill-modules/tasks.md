# Tasks

- [x] Task 1: 创建 `core.js` 核心工具模块 — 从 api-helpers.js 提取 `apiPost`、`apiGet`、`getAuthToken`、`isSuccess`、`log`、`BASE`、`OPENAPI_BASE`、`ERROR_CODES`
  - [x] 不依赖 shared/browser-manager.js（core.js 是纯 API 工具层，仅需 page 参数）
  - [x] 顶部 JSDoc 含使用示例

- [x] Task 2: 创建 `visibility.js` 可视模式模块 — 提取 `enableVisibility`、`disableVisibility`、`isVisibilityOn`
  - [x] 依赖 core.js，`if (require.main === module)` 用 shared/browser-manager.js 管理浏览器生命周期

- [x] Task 3: 创建 `create-object.js` 对象创建模块 — 提取 `createObject`
  - [x] 依赖 core.js，`if (require.main === module)` 用 shared/browser-manager.js 演示

- [x] Task 4: 创建 `create-field.js` 字段创建模块 — 提取通用 `createField` + 14 个类型快捷函数 + `queryFields`
  - [x] `if (require.main === module)` 创建文本字段 → 查询验证

- [x] Task 5: 创建 `create-picklist.js` 选项集创建模块 — 提取 `createPicklist`
  - [x] `if (require.main === module)` 创建含 3 个选项值的选项集

- [x] Task 6: 创建 `save-form-layout.js` 表单布局模块 — 提取 `saveFormLayout`
  - [x] `if (require.main === module)` 创建演示布局

- [x] Task 7: 创建 `save-list-layout.js` 列表布局模块 — 提取 `saveListLayout` + `addListColumns`
  - [x] `if (require.main === module)` 创建列表 → 添加列

- [x] Task 8: 创建 `create-lifecycle-status.js` 生命周期状态模块 — 提取 `createLifecycleStatus`
  - [x] `if (require.main === module)` 创建演示状态

- [x] Task 9: 创建 `openapi-queries.js` OpenAPI 查询模块 — 提取 5 个查询函数
  - [x] 依赖 core.js，`if (require.main === module)` 登录 → 查询已知对象

- [x] Task 10: 创建 `orchestrate.js` 编排器模块 — 串联所有功能模块为完整配置工作流
  - [x] 导入 shared/browser-manager.js + 所有功能模块
  - [x] 导出 `runFullWorkflow(page, config)` 函数，接受 blueprint 配置对象
  - [x] `if (require.main === module)` 一键运行完整演示

- [x] Task 11: 创建 `index.js` 统一入口 — 重新导出全部 10 个模块
  - [x] 导出接口与旧 api-helpers.js 完全一致（函数名和签名不变）
  - [x] 新增导出 `runFullWorkflow`
  - [x] 保留 Playwright 演示模式

- [x] Task 12: 更新 `SKILL.md` — 文件结构 + 各章节嵌入代码示例 + 新增附录 E
  - [x] 顶部「文件结构」章节：更新为 9 功能 + 1 编排器 + 1 入口，标注 shared/browser-manager.js
  - [x] 第零章「执行架构」：添加三层架构说明
  - [x] 第二章「对象」：末尾嵌入 createObject 的 Node.js 代码示例
  - [x] 第三章「选项集」：末尾嵌入 createPicklist 的 Node.js 代码示例
  - [x] 第四章「字段」：末尾嵌入 createField 各类型的 Node.js 代码示例
  - [x] 第五章「表单布局」：末尾嵌入 saveFormLayout 的 Node.js 代码示例（含 sections + controls 结构）
  - [x] 第六章「列表布局」：末尾嵌入两步创建的 Node.js 代码示例
  - [x] 第七章「生命周期」：末尾嵌入 createLifecycleStatus 批量创建的 Node.js 代码示例
  - [x] 新增「附录 E：API 模块速查表」：列出 11 个模块信息

- [x] Task 13: 更新 `examples/full-workflow.md` — 改为三种方式并列
  - [x] 方式一（推荐）：Node.js require 模块 + shared/browser-manager.js
  - [x] 方式二（一键）：引用 orchestrate.js 编排器
  - [x] 方式三（备选）：统一入口兼容旧模式

- [x] Task 14: 删除旧 `scripts/api-helpers.js`
  - [x] 确认 index.js 导出覆盖所有旧函数
  - [x] 确认无其他文件 require api-helpers.js
  - [x] 删除文件
