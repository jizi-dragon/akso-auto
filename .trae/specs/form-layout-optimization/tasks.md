# Tasks

## 阶段 1：API 行为学习（实操演示，仅监听和记录）

- [x] Task 1: 搭建浏览器监听环境，准备捕获表单布局相关 API 调用
  - 启动浏览器并登录 Akso
  - 启用全量网络请求/响应日志
  - 等待用户进入"测试999"对象的默认表单布局

- [x] Task 2: 监听并记录"创建两个部分并添加控件"的 API 调用
  - 用户在默认表单布局中创建两个部分并在各部分下添加控件
  - 捕获发现：所有操作通过一次 `SaveLayoutDetail` 全量提交完成

- [x] Task 3: 分析捕获数据，输出 API 行为总结
  - **关键发现**：sections 和 controls 没有独立端点，统一通过 `SaveLayoutDetail` 全量提交
  - 确认 section 最小字段：`{ id, code, name, type, columnsNum }`
  - 确认 control 最小字段：`{ id, sectionId, code, name, fieldId, type, gridSpan, attrs }`
  - 确认 control type 映射（8 种组件类型）
  - 确认默认布局特征：`source: 2`, `isMain: true`, code `{对象code}_base_layout__ak`

## 阶段 2：代码重构

- [x] Task 4: 重写 `lib/save-form-layout.js`
  - 新增 `getFormLayouts(page, objectId)` — 查询对象的表单布局
  - 新增 `getFormLayoutDetail(page, layoutId)` — 获取布局详情（含 sections + controls）
  - 改进 `saveFormLayout` — 正确的全量替换语义 + 完整参数文档
  - 新增 `CONTROL_TYPE` 常量（8 种组件类型映射）
  - 添加完整 JSDoc 和使用示例

- [x] Task 5: 更新 `lib/orchestrate.js`
  - 移除旧的表单布局一键创建逻辑
  - 改为提示使用默认布局

- [x] Task 6: 更新 `lib/index.js`
  - barrel 展开自动包含所有新增导出，无需修改

- [x] Task 7: 更新 `README.md`
  - 重写第五节"表单布局"文档
  - 新增 5.1 核心概念 + 5.2 相关 API + 5.3 API 详情 + 5.4 代码示例
  - 更新所有汇总表格
  - 版本号 v0.5.1，核心 API 14→16

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 4 依赖 Task 3
- Task 5, 6, 7 依赖 Task 4（可并行）
