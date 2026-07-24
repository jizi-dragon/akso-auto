# Checklist

- [x] `lib/create-workflow.js` 文件存在，导出 createWorkflow / getWorkflow / listWorkflows / changeWorkflowStatus / deleteWorkflow + WORKFLOW_STATUS / WORKFLOW_TYPE 常量
- [x] `lib/create-workflow-step.js` 文件存在，导出 addTaskStep / addDecisionStep / addActionStep / copyStep / updateTaskStep / updateDecisionStep / updateActionStep / getWorkflowSteps / getStepDetail + STEP_TYPE / DISPATCH_MODE / TASK_REQUIRE_TYPE 常量
- [x] `lib/save-workflow-start-step.js` 文件存在，导出 configStartStep / getStartStepControls + CTRL_TYPE / SELECT_USER_TYPE 常量
- [x] `lib/save-lifecycle-user-action.js` 文件存在，导出 getUserActions / bindWorkflowToStatus + BEHAVIOR_TYPE / BELONG_TYPE 常量
- [x] `lib/core.js` 已添加 `apiPatch()` 和 `apiDelete()` 方法
- [x] `lib/index.js` 已重新导出所有新增模块的函数和常量
- [x] `README.md` 第八节"工作流"已从"❌ 待探索"更新为完整 API 文档（§8.1-8.7）
- [x] `README.md` 附录 A（API 路径速查）已补全 10 个工作流步骤/绑定 API
- [x] `README.md` 附录 E（模块速查表）已补全 3 个新增模块条目 + core.js apiPatch/apiDelete
- [x] 所有模块函数签名与 spec.md 中的 Scenario 描述一致
