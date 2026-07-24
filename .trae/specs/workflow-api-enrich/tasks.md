# Tasks

## 阶段 1：工作流基础信息模块

- [x] Task 1: 创建 `lib/create-workflow.js`
  - 实现 `createWorkflow(page, config)` — 添加工作流基础信息
  - 实现 `getWorkflow(page, workflowConfigId)` — 查询工作流详情
  - 实现 `listWorkflows(page, filters)` — 分页查询工作流列表
  - 实现 `changeWorkflowStatus(page, workflowConfigId, workflowBasicId, status)` — 启用/禁用
  - 实现 `deleteWorkflow(page, workflowConfigId)` — 删除工作流
  - 导出 `WORKFLOW_STATUS` 常量（10=草稿, 20=启用）
  - 导出 `WORKFLOW_TYPE` 常量（10=记录工作流）

## 阶段 2：工作流步骤模块

- [x] Task 2: 创建 `lib/create-workflow-step.js`
  - 实现 `addTaskStep(page, config)` — 添加审批步骤（stepType=30）
  - 实现 `addDecisionStep(page, config)` — 添加判断步骤（stepType=70）
  - 实现 `addActionStep(page, config)` — 添加动作步骤（stepType=90）
  - 实现 `copyStep(page, config)` — 复制步骤
  - 实现 `updateTaskStep(page, stepId, updates)` — 更新审批步骤
  - 实现 `updateDecisionStep(page, stepId, updates)` — 更新判断步骤
  - 实现 `updateActionStep(page, stepId, updates)` — 更新动作步骤
  - 实现 `getWorkflowSteps(page, workflowConfigId)` — 查询所有步骤
  - 实现 `getStepDetail(page, stepId)` — 查询步骤详情
  - 导出 `STEP_TYPE` 常量（10=开始, 20=结束, 30=审批, 70=判断, 90=动作）
  - 导出 `DISPATCH_MODE` 常量（10=会签, 20=或签）
  - 导出 `TASK_REQUIRE_TYPE` 常量（20=必选）

## 阶段 3：开始步骤配置模块

- [x] Task 3: 创建 `lib/save-workflow-start-step.js`
  - 实现 `configStartStep(page, config)` — 配置开始步骤的参与者 + 连线
  - 实现 `getStartStepControls(page, workflowConfigId, stepId)` — 查询开始步骤控件
  - 导出 `CTRL_TYPE` 常量（20=参与者）
  - 导出 `SELECT_USER_TYPE` 常量（10=指定用户）

## 阶段 4：生命周期用户动作模块

- [x] Task 4: 创建 `lib/save-lifecycle-user-action.js`
  - 实现 `getUserActions(page, statusId)` — 查询状态下的用户动作
  - 实现 `bindWorkflowToStatus(page, config)` — 创建/更新"发起工作流"动作
  - 导出 `BEHAVIOR_TYPE` 常量（7=发起工作流）
  - 导出 `BELONG_TYPE` 常量（2=状态）

## 阶段 5：统一入口 + 文档更新

- [x] Task 5: 更新统一入口和 README
  - 更新 `lib/index.js` — 重新导出所有新增模块的函数和常量
  - 更新 `lib/core.js` — 添加 `apiPatch()` / `apiDelete()` 方法
  - 重写 `README.md` 第八节"工作流" — 从"❌ 待探索"更新为完整 API 文档
  - 更新 `README.md` 附录 A（API 路径速查）和附录 E（模块速查表）

# Task Dependencies
- Task 2 依赖 Task 1（步骤需要 workflowConfigId）
- Task 3 依赖 Task 1（需要已有开始步骤）
- Task 4 依赖 Task 1（绑定需要 workflowBasicId）
- Task 5 依赖 Task 1~4（所有模块就绪后统一更新入口和文档）
- Task 1 / Task 4 可并行
- Task 2 / Task 3 可并行
