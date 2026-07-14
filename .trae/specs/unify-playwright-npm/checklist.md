# Checklist

## 共享基础设施
- [x] `shared/browser-manager.js` 文件存在，导出 `launchBrowser` / `login` / `closeBrowser`
- [x] `launchBrowser()` 可启动 headless 和 headed 两种模式
- [x] `login()` 正确处理 iframe 密码输入 + 隐私复选框 + 等待 `/web` 落地
- [x] `closeBrowser()` 先关 context 再关 browser，无资源泄漏

## DOM 脚本重构（akso-basic-config/scripts/）
- [x] `login.js` 已改为 Node.js 模块，支持 `require` 引入和直接 `node` 执行
- [x] `login-one-shot.js` 已删除
- [x] `dismiss-popup.js` 已改为 Node.js 模块
- [x] `create-object.js` 已改为 Node.js 模块
- [x] `create-field.js` 已改为 Node.js 模块
- [x] `create-option-set.js` 已改为 Node.js 模块
- [x] `save-and-verify.js` 已改为 Node.js 模块
- [x] `exact-search-click.js` 已改为 Node.js 模块
- [x] `helpers.js` 已改为导出函数模块
- [x] `field-type-select.js` 已改为导出函数模块
- [x] `object-bind.js` 已改为导出函数模块
- [x] `option-set-bind.js` 已改为导出函数模块
- [x] `parent-object-bind.js` 已改为导出函数模块
- [x] 所有脚本文件中不再出现 `globalThis.__` 全局变量传参方式
- [x] 所有脚本文件中不再出现 `playwright-cli` / `browser_run_code_unsafe` 字样

## API 脚本重构（akso-basic-config-api/scripts/）
- [x] `api-helpers.js` 已改为 Node.js 模块
- [x] `api-helpers.js` 使用 Playwright 的 `page.context().cookies()` 获取 token
- [x] `api-helpers.js` 中不再出现 `document.cookie` 提取 token 的方式

## SKILL.md 文档更新
- [x] `akso-basic-config/SKILL.md` 执行入口已更新为 "Playwright npm 包"
- [x] `akso-basic-config/SKILL.md` 脚本文件结构说明中不再提及 `browser_run_code_unsafe`
- [x] `akso-basic-config/SKILL.md` 附录 D 调用示例已改为 `node scripts/<name>.js`
- [x] `akso-basic-config/SKILL.md` 中不再提及 `login-one-shot.js`
- [x] `akso-basic-config-api/SKILL.md` 执行入口已更新为 "Playwright npm 包"
- [x] `akso-basic-config-api/SKILL.md` 认证说明已更新为 `page.context().cookies()`
- [x] `akso-gmp/SKILL.md` 架构图中的执行方式描述已更新

## 示例文件更新
- [x] `examples/login.md` 调用方式已更新
- [x] `examples/create-object-full.md` 调用方式已更新
- [x] `examples/create-option-set.md` 调用方式已更新
- [x] `examples/create-all-field-types.md` 调用方式已更新

## 待攻克模块保留
- [x] `workflow-editor.js`、`form-layout-dnd.js`、`lifecycle-flow.js`、`code-rule-editor.js` 四个待攻克文件保留不变（当前仅占位注释）
