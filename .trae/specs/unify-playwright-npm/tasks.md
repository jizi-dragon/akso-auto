# Tasks

## 第一轮：共享基础设施 + 核心脚本重构（可并行）

- [x] Task 1: 新建 `shared/browser-manager.js`
  - [x] 1.1 实现 `launchBrowser({ headless })` — 启动 Chromium，返回 `{ browser, context, page }`
  - [x] 1.2 实现 `login(page, { baseUrl, username, password })` — 导航登录页→填表单→勾选隐私→点击登录→等待 `/web`→返回 `{ success, url }`
  - [x] 1.3 实现 `closeBrowser(browser)` — `context.close()` → `browser.close()`
  - [x] 1.4 支持环境变量 `AKSO_BASE_URL` / `AKSO_USERNAME` / `AKSO_PASSWORD` 读写

- [x] Task 2: 重构 akso-basic-config/scripts/ 核心模块（8 个已可用原子模块）
  - [x] 2.1 重写 `login.js` — 改为 `require('../../../../shared/browser-manager')`，从 `async (page) => {}` 改为 Node.js 模块，支持 `module.exports` + 直接 `node` 执行，并入 login-one-shot 的简化用法
  - [x] 2.2 重写 `dismiss-popup.js` — 同上，导出 `dismissAllPopups(page)` 函数
  - [x] 2.3 重写 `create-object.js` — 改为 `require` browser-manager，导出 `createObject(page, { name, code, enableLifecycle })` + 独立执行入口
  - [x] 2.4 重写 `create-field.js` — 同上，导出 `createField(page, { name, code, dataType, objectName, required, picklist, refObject })`
  - [x] 2.5 重写 `create-option-set.js` — 同上，导出 `createOptionSet(page, { name, code, options })`
  - [x] 2.6 重写 `save-and-verify.js` — 同上，导出 `saveAndVerify(page, { expectedUrlPattern })`
  - [x] 2.7 重写 `exact-search-click.js` — 同上，导出 `exactSearchClick(page, { keyword, exactName, listUrl })`
  - [x] 2.8 删除 `login-one-shot.js` — 功能已并入 `login.js`

- [x] Task 3: 重构 akso-basic-config/scripts/ 辅助模块（4 个代码片段/辅助脚本）
  - [x] 3.1 重写 `helpers.js` — 改为导出函数模块：`verifyFieldSaved()`, `verifyObjectSaved()`, `getFieldList()`, `safeFill()`, `selectFromAntSelect()`, `dismissAllPopups()`, `exactMatchClick()`
  - [x] 3.2 重写 `field-type-select.js` — 改为导出函数模块：`selectFieldType(page, typeName)`
  - [x] 3.3 重写 `object-bind.js` — 改为导出函数模块：`bindObject(page, objectName)`
  - [x] 3.4 重写 `option-set-bind.js` — 改为导出函数模块：`bindOptionSet(page, optionSetName)`
  - [x] 3.5 重写 `parent-object-bind.js` — 改为导出函数模块：`bindParentObject(page, objectName)`

- [x] Task 4: 改造 api-helpers.js（API 执行层）
  - [x] 4.1 从 `browser_run_code_unsafe` 粘贴模式改为 Node.js 模块，`require('playwright')` + `require('../../../../shared/browser-manager')`
  - [x] 4.2 Token 获取方式从 `document.cookie` 改为 Playwright `page.context().cookies()` API
  - [x] 4.3 `page.evaluate(fetch)` 逻辑保留，但包装在 `page.evaluate()` 调用中由 Node.js 侧发起
  - [x] 4.4 导出所有封装函数（`apiPost`, `getObjectInfo`, `createField`, 等）

## 第二轮：SKILL.md 文档更新（可并行）

- [x] Task 5: 更新 `akso-basic-config/SKILL.md`
  - [x] 5.1 修改第 16 行执行入口：`Playwright MCP 或 playwright-cli` → `Playwright npm 包 (require('playwright'))`
  - [x] 5.2 修改第 28 行脚本说明：`browser_run_code_unsafe` → `Node.js 模块，require('../shared/browser-manager')`
  - [x] 5.3 更新附录 D 原子模块速查表：调用示例从 `playwright-cli run-code --filename` 改为 `node scripts/<name>.js`
  - [x] 5.4 删除 `login-one-shot.js` 在文件结构中的引用

- [x] Task 6: 更新 `akso-basic-config-api/SKILL.md`
  - [x] 6.1 修改第 17 行执行入口：`browser_run_code_unsafe + page.evaluate(fetch)` → `Playwright npm 包 + page.evaluate(fetch)`
  - [x] 6.2 更新 0.2 认证说明：cookie 提取方式从 `document.cookie` 改为 `page.context().cookies()`
  - [x] 6.3 更新 api-helpers.js 的使用说明

- [x] Task 7: 更新 `akso-gmp/SKILL.md`
  - [x] 7.1 修改架构图中 29-30 行：akso-basic-config 描述从 "浏览器 Playwright 操作" 改为 "Playwright npm 包 — DOM 操作"
  - [x] 7.2 修改架构图中 akso-basic-config-api 描述从 "HTTP API 直调 (40x 提速)" 改为 "Playwright npm 包 — API 直调 (40x 提速)"

## 第三轮：示例文件更新 + 最终验证

- [x] Task 8: 更新 4 个示例文件
  - [x] 8.1 更新 `examples/login.md` — 调用方式改为 npm 包
  - [x] 8.2 更新 `examples/create-object-full.md` — 同上
  - [x] 8.3 更新 `examples/create-option-set.md` — 同上
  - [x] 8.4 更新 `examples/create-all-field-types.md` — 同上

- [x] Task 9: 验证 `login.js` 新版本可用
  - [x] 9.1 执行 `node -e "require(...)"` 模块加载验证，确认 `require` 引入模式正常
  - [x] 9.2 模块导出验证：`login` 和 `main` 均为 function 导出

# Task Dependencies
- Task 2~4 均依赖 Task 1（共享基础设施）
- Task 5~8 依赖 Task 2~4（脚本重构完成后才能更新文档）
- Task 9 依赖 Task 2.1（login.js 重构完成）
