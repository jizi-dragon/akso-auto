# 工作流 API 能力丰富 Spec

## Why
`akso-basic-config-api` 工具第八节"工作流"模块目前标记为"❌ 待探索"。通过 `workflow-creation-learning` 阶段已完整捕获工作流创建/步骤配置/生命周期绑定的 22 个 API 端点和数据结构，现在将已验证的 API 封装为可复用的代码模块。

## What Changes
- 新增 `lib/create-workflow.js` — 工作流基础信息 CRUD + 启用/禁用
- 新增 `lib/create-workflow-step.js` — 审批/判断/动作步骤的增删改 + 复制
- 新增 `lib/save-workflow-start-step.js` — 开始步骤的参与者配置 + 连线
- 新增 `lib/save-lifecycle-user-action.js` — 生命周期状态绑定工作流（behaviorType=7）
- **BREAKING**: 无，均为新增模块，不影响现有 API

## Impact
- Affected specs: workflow-creation-learning（数据来源）
- Affected code: `tools/akso-basic-config-api/lib/` 新增 4 个模块文件
- Affected docs: `tools/akso-basic-config-api/README.md` 第八节需从"待探索"更新为完整 API 文档

## ADDED Requirements

### Requirement: 工作流基础信息管理
系统 SHALL 提供工作流基础信息的创建、查询、更新、删除、启用/禁用能力。

#### Scenario: 创建工作流基础信息
- **WHEN** 调用 `createWorkflow(page, { name, code, objectId, lifecycleId, workflowType, isSingleRecord })`
- **THEN** 发送 `POST /api/platform/Workflow/AddWorkflowBasic`，返回 `{ success, workflowConfigId, workflowBasicId }`

#### Scenario: 启用工作流
- **WHEN** 调用 `changeWorkflowStatus(page, workflowConfigId, workflowBasicId, status)`
- **THEN** 发送 `POST /api/platform/Workflow/ChangeWorkflowBasicStatus`，status=20 为启用

### Requirement: 工作流步骤管理
系统 SHALL 提供审批步骤、判断步骤、动作步骤的增删改能力，以及步骤复制功能。

#### Scenario: 添加审批步骤
- **WHEN** 调用 `addTaskStep(page, { workflowConfigId, name, code, taskAssign, approvals, ... })`
- **THEN** 发送 `POST /api/platform/Workflow/AddWorkflowTaskStep`，自动构建 stepTaskConfig + stepTaskApprovals

#### Scenario: 添加判断步骤
- **WHEN** 调用 `addDecisionStep(page, { workflowConfigId, name, code, rules, elseNextStepId })`
- **THEN** 发送 `POST /api/platform/Workflow/AddWorkflowDecisionStep`，rules 中每条含 targetId/logicType/logicValue/nextStepId

#### Scenario: 添加动作步骤
- **WHEN** 调用 `addActionStep(page, { workflowConfigId, name, code, behaviorType, behaviorValue, nextStepId })`
- **THEN** 发送 `POST /api/platform/Workflow/AddWorkflowActionStep`

#### Scenario: 步骤连线
- **WHEN** 调用 `updateStepLink(page, stepId, stepType, updates)` 更新步骤的 nextStepId
- **THEN** 根据 stepType 路由到对应 Update API（UpdateWorkflowTaskStep / UpdateWorkflowDecisionStep / UpdateWorkflowActionStep）

### Requirement: 开始步骤参与者配置
系统 SHALL 提供工作流开始步骤的参与者（审批人/批准人）配置和连线能力。

#### Scenario: 配置开始步骤参与者
- **WHEN** 调用 `configStartStep(page, { workflowConfigId, ...startStep, participants: [{ name, ctrlType, selectUserType }], nextStepId })`
- **THEN** 发送 `POST /api/platform/Workflow/UpdateWorkflowStartStep`，自动构建 startUpControls 数组

### Requirement: 生命周期状态绑定工作流
系统 SHALL 提供在生命周期状态上创建"发起工作流"用户动作的能力。

#### Scenario: 绑定工作流到生命周期状态
- **WHEN** 调用 `bindWorkflowToStatus(page, { statusId, lifecycleId, objectId, objectCode, workflowBasicId, actionName, actionCode })`
- **THEN** 发送 `PATCH /api/config/lifecycle/UserAction/Update`，behaviorType=7，behaviorValue 含 workflowId
