# Checklist

## 三层依赖架构
- [x] `core.js` 不依赖 shared/browser-manager.js，仅需 page 参数
- [x] 所有功能模块通过 core.js 发出 API 请求
- [x] 所有模块的 `if (require.main === module)` 独立运行入口统一使用 shared/browser-manager.js
- [x] 纯库函数调用时不管理浏览器生命周期（仅接受 page 参数）

## 模块拆分正确性
- [x] `core.js` 导出 apiPost / apiGet / getAuthToken / isSuccess / log / BASE / OPENAPI_BASE / ERROR_CODES
- [x] `visibility.js` 独立可导入 + 可独立运行
- [x] `create-object.js` 独立可导入 + 可独立运行，createObject 签名不变
- [x] `create-field.js` 独立可导入 + 可独立运行，含全部 14 个类型快捷函数 + queryFields
- [x] `create-picklist.js` 独立可导入 + 可独立运行，createPicklist 签名不变
- [x] `save-form-layout.js` 独立可导入 + 可独立运行，saveFormLayout 签名不变
- [x] `save-list-layout.js` 独立可导入 + 可独立运行，含 saveListLayout + addListColumns
- [x] `create-lifecycle-status.js` 独立可导入 + 可独立运行，createLifecycleStatus 签名不变
- [x] `openapi-queries.js` 独立可导入 + 可独立运行，含全部 5 个 OpenAPI 查询函数

## 编排器模块
- [x] `orchestrate.js` 导入 shared/browser-manager.js 管理浏览器生命周期
- [x] `orchestrate.js` 按依赖顺序串联所有功能模块
- [x] 导出 `runFullWorkflow(page, config)` 函数，接受 blueprint 配置对象
- [x] `if (require.main === module)` 可一键运行完整演示

## JSDoc 示例注释
- [x] 每个模块文件顶部 JSDoc 含可复制运行的代码示例
- [x] 示例展示了 shared/browser-manager.js 的导入和生命周期管理

## SKILL.md 代码示例
- [x] 第二章「对象」末尾嵌入 createObject 的 Node.js 代码示例
- [x] 第三章「选项集」末尾嵌入 createPicklist 的 Node.js 代码示例
- [x] 第四章「字段」末尾嵌入 createField 各类型的 Node.js 代码示例
- [x] 第五章「表单布局」末尾嵌入 saveFormLayout 的 Node.js 代码示例
- [x] 第六章「列表布局」末尾嵌入两步创建的 Node.js 代码示例
- [x] 第七章「生命周期」末尾嵌入 createLifecycleStatus 批量创建的 Node.js 代码示例
- [x] 所有嵌入示例遵循统一模板（shared 导入 → 浏览器生命周期 → 业务逻辑 → 清理）

## full-workflow.md 更新
- [x] 方式一（推荐）：Node.js require 模块 + shared/browser-manager.js
- [x] 方式二（一键）：引用 orchestrate.js 编排器
- [x] 方式三（备选）：统一入口兼容旧模式

## 统一入口兼容性
- [x] `index.js` 导出全部旧 api-helpers.js 的函数（函数名完全一致）
- [x] `index.js` 新增导出 `runFullWorkflow`
- [x] `index.js` 独立运行（node index.js）可正常演示

## SKILL.md 结构更新
- [x] 顶部文件结构说明已更新，标注 shared/browser-manager.js 为公用层
- [x] 第零章执行架构添加三层架构说明
- [x] 新增「附录 E：API 模块速查表」含全部 11 个模块信息

## 清理
- [x] 旧 `api-helpers.js` 已删除
- [x] 无其他文件残留 `require('./api-helpers')` 引用（仅剩兼容性文档说明）
