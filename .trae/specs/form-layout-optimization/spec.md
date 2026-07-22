# 表单布局优化 Spec

## Why
当前 `save-form-layout.js` 的实现将 section + control 拼成一个巨大的 JSON 一次性提交，这与真实 UI 交互流程严重不符。实际 API 中 sections 和 controls 是分步管理的，且每个对象创建时已自带默认表单布局。需要参考列表布局优化的经验，通过实操演示学习真实 API 行为后重构。

## What Changes
- 新增 `getFormLayouts(page, objectId)` — 查询对象的表单布局列表（含默认布局）
- 新增 `getFormSections(page, layoutId)` — 查询表单布局下的"部分"列表
- 新增 `getFormControls(page, sectionId)` — 查询某个"部分"下的控件列表
- 新增 `saveFormSection(page, layoutId, section)` — 创建/更新一个"部分"
- 新增 `saveFormControl(page, sectionId, control)` — 在"部分"下创建/更新一个控件
- 废弃 `saveFormLayout`（标记 `@deprecated`）— 原有一次性全量提交模式不符合实际 API 行为
- **BREAKING**: `orchestrate.js` 中表单布局创建流程需改为分步模式（或暂时移除自动创建）

## Impact
- Affected specs: 表单布局（Layout/SaveLayoutDetail）
- Affected code: `lib/save-form-layout.js`, `lib/orchestrate.js`, `lib/index.js`, `README.md`

## ADDED Requirements
### Requirement: 查询对象的表单布局列表
系统 SHALL 提供 `getFormLayouts(page, objectId)` 函数，通过 GET 请求获取指定对象的所有表单布局。

#### Scenario: 获取默认表单布局
- **WHEN** 对象创建后调用 `getFormLayouts`
- **THEN** 返回的布局列表中至少包含一个 `source: 2` 的默认表单布局

### Requirement: 查询表单布局的"部分"
系统 SHALL 提供 `getFormSections(page, layoutId)` 函数，获取指定表单布局下的所有"部分"（section）。

### Requirement: 查询"部分"下的控件
系统 SHALL 提供 `getFormControls(page, sectionId)` 函数，获取指定"部分"下的所有控件。

### Requirement: 创建/更新"部分"
系统 SHALL 提供 `saveFormSection(page, layoutId, section)` 函数，支持创建新部分和更新已有部分。

### Requirement: 创建/更新控件
系统 SHALL 提供 `saveFormControl(page, sectionId, control)` 函数，支持在指定"部分"下创建或更新控件。

## MODIFIED Requirements
### Requirement: 废弃旧 saveFormLayout
原 `saveFormLayout` 函数标记为 `@deprecated`，引导用户改用新的分步 API（先查询默认布局 → 添加 sections → 添加 controls）。

## REMOVED Requirements
无。
