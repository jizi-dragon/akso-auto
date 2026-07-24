/**
 * akso-basic-config-api — 工作流步骤 CRUD
 *
 * 提供工作流步骤的增删改查：审批步骤、判断步骤、动作步骤。
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
 * const { addTaskStep, addDecisionStep, getWorkflowSteps } = require('./create-workflow-step');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const result = await addTaskStep(page, {
 *   workflowConfigId: 'xxx',
 *   name: '审核',
 *   code: 'shenhe__c',
 *   taskAssign: 'participant-uuid'
 * });
 * console.log(result); // → { success: true, stepId: '...', data: {...} }
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node lib/create-workflow-step.js
 */

const crypto = require('crypto');
const { apiPost, apiGet, isSuccess, log } = require('./core');

// ─── 常量 ────────────────────────────────────────────────

/** 步骤类型 */
const STEP_TYPE = { START: 10, END: 20, TASK: 30, DECISION: 70, ACTION: 90 };

/** 分发模式 */
const DISPATCH_MODE = { COUNTERSIGN: 10, OR_SIGN: 20 };

/** 任务要求类型 */
const TASK_REQUIRE_TYPE = { REQUIRED: 20 };

/** 审批按钮样式 */
const APPROVAL_BUTTON_STYLE = { DEFAULT: 20 };

/** 原因输入类型 */
const REASON_INPUT_TYPE = { OPTIONAL: 20 };

/** 判断逻辑类型 */
const LOGIC_TYPE = { EQUAL: 40 };

// ─── 辅助 ────────────────────────────────────────────────

/** @returns {string} 随机 UUID */
function uuid() {
  return crypto.randomUUID();
}

/** @param {object} resp - API 响应 */
function ok(resp) {
  return resp && resp.code === 0;
}

/**
 * 生成默认审批按钮配置（同意 + 驳回）
 * @param {string} [agreeLabel='同意审核'] - 同意按钮标签
 * @returns {Array} approvals 数组
 */
function defaultApprovals(agreeLabel) {
  return [
    {
      id: uuid(),
      sort: 0,
      approvalButtonStyle: APPROVAL_BUTTON_STYLE.DEFAULT,
      name: '同意',
      isShowRemark: false,
      isShowResons: true,
      resonTitle: '备注',
      reasonInputType: REASON_INPUT_TYPE.OPTIONAL,
      isShowResponsibilities: true,
      responsibleOptions: [{ id: uuid(), value: agreeLabel || '审核同意该申请' }],
      responsibieTitle: '签名含义',
      isRequireResponsibilities: true
    },
    {
      id: uuid(),
      sort: 1,
      approvalButtonStyle: APPROVAL_BUTTON_STYLE.DEFAULT,
      name: '驳回',
      isShowResons: true,
      isShowResponsibilities: true,
      responsibleOptions: [],
      resonTitle: '备注',
      reasonInputType: REASON_INPUT_TYPE.OPTIONAL,
      responsibieTitle: '驳回该申请',
      isRequiredResons: true
    }
  ];
}

// ─── 添加步骤 ────────────────────────────────────────────

/**
 * 添加审批步骤
 *
 * @param {object} page - Playwright page 对象
 * @param {object} config - 审批步骤配置
 * @param {string} config.workflowConfigId - 工作流配置 ID
 * @param {string} config.name - 步骤名称
 * @param {string} config.code - 步骤编码（__c 结尾）
 * @param {string} config.taskAssign - 审批人用户控件 ID（来自开始步骤 participantConfig.id）
 * @param {string} [config.taskName] - 审批任务名称，默认取 config.name + '任务'
 * @param {number} [config.dispatchMode=10] - 分发模式（10=会签, 20=或签）
 * @param {number} [config.taskRequireType=20] - 任务要求类型
 * @param {string} [config.approvalLabel='是否同意审核'] - 审批按钮标签
 * @param {Array} [config.approvals] - 自定义审批按钮配置，不传则默认生成同意+驳回
 * @param {string} [config.nextStepId=''] - 下一步步骤 ID
 * @returns {Promise<{success: boolean, stepId?: string, message: string, data?: object, result?: object}>}
 */
async function addTaskStep(page, {
  workflowConfigId,
  name,
  code,
  taskAssign,
  taskName,
  dispatchMode = DISPATCH_MODE.COUNTERSIGN,
  taskRequireType = TASK_REQUIRE_TYPE.REQUIRED,
  approvalLabel,
  approvals,
  nextStepId = ''
}) {
  const stepTaskApprovals = approvals || defaultApprovals(approvalLabel || '是否同意审核');

  const body = {
    step: {
      nextStepId,
      name,
      code,
      stepType: STEP_TYPE.TASK,
      stepTaskConfig: {
        taskNodeType: 0,
        preTaskIds: '',
        reciverType: 20,
        notifyType: 0,
        selectStatusTypeIds: '',
        externalSignatureInfoFrom: 1,
        name: taskName || `${name}任务`,
        taskAssign,
        isAssignToPromoter: false,
        userControlIds: taskAssign,
        dispatchMode,
        taskRequireType,
        isRequireApproval: true,
        isApprovalShowAsButton: true,
        approvalLabel: approvalLabel || '是否同意审核',
        pageOpenType: 0,
        breakApproveIds: ''
      },
      stepTaskShareSettingRules: [],
      stepTaskNotifies: [],
      stepTaskApprovals,
      workflowConfigId
    }
  };

  const resp = await apiPost(page, '/api/platform/Workflow/AddWorkflowTaskStep', body);
  const success = ok(resp);
  log(`添加审批步骤[${name}]`, { success, message: resp.message || '完成' });
  return {
    success,
    message: success ? `审批步骤[${name}]创建成功` : (resp.message || '创建失败'),
    stepId: success ? resp.data?.step?.id : undefined,
    data: resp.data,
    result: resp
  };
}

/**
 * 添加判断步骤
 *
 * @param {object} page - Playwright page 对象
 * @param {object} config - 判断步骤配置
 * @param {string} config.workflowConfigId - 工作流配置 ID
 * @param {string} config.name - 步骤名称
 * @param {string} config.code - 步骤编码（__c 结尾）
 * @param {Array} config.rules - 判断规则数组
 * @param {string} config.rules[].targetId - 目标步骤 ID
 * @param {string} config.rules[].targetCode - 目标步骤编码
 * @param {number} config.rules[].logicType - 逻辑类型（40=等于）
 * @param {string} config.rules[].logicValue - 逻辑比较值（如 "\"审批按钮UUID\""）
 * @param {string} config.rules[].nextStepId - 满足条件时跳转的步骤 ID
 * @param {string} [config.rules[].conditionLabel='满足条件'] - 条件标签
 * @param {string} config.elseNextStepId - 否则跳转的步骤 ID
 * @param {string} [config.nextStepId=''] - 步骤的下一步 ID（一般不用于判断步骤）
 * @returns {Promise<{success: boolean, stepId?: string, message: string, data?: object, result?: object}>}
 */
async function addDecisionStep(page, {
  workflowConfigId,
  name,
  code,
  rules,
  elseNextStepId,
  nextStepId = ''
}) {
  const decisionRules = rules.map((r, i) => ({
    id: uuid(),
    sort: i,
    targetType: 7,
    targetId: r.targetId,
    targetCode: r.targetCode,
    logicType: r.logicType ?? LOGIC_TYPE.EQUAL,
    logicValue: r.logicValue,
    nextStepId: r.nextStepId,
    conditionLabel: r.conditionLabel || '满足条件'
  }));

  const body = {
    step: {
      nextStepId,
      name,
      code,
      stepType: STEP_TYPE.DECISION,
      decisionRules,
      elseNextStepId,
      workflowConfigId
    }
  };

  const resp = await apiPost(page, '/api/platform/Workflow/AddWorkflowDecisionStep', body);
  const success = ok(resp);
  log(`添加判断步骤[${name}]`, { success, message: resp.message || '完成' });
  return {
    success,
    message: success ? `判断步骤[${name}]创建成功` : (resp.message || '创建失败'),
    stepId: success ? resp.data?.step?.id : undefined,
    data: resp.data,
    result: resp
  };
}

/**
 * 添加动作步骤
 *
 * @param {object} page - Playwright page 对象
 * @param {object} config - 动作步骤配置
 * @param {string} config.workflowConfigId - 工作流配置 ID
 * @param {string} config.name - 步骤名称
 * @param {string} config.code - 步骤编码（__c 结尾）
 * @param {number} config.behaviorType - 动作行为类型（如 9=修改记录状态）
 * @param {object} config.behaviorValue - 动作行为值（如 { statusId: 'uuid' }）
 * @param {string} [config.nextStepId=''] - 下一步步骤 ID
 * @returns {Promise<{success: boolean, stepId?: string, message: string, data?: object, result?: object}>}
 */
async function addActionStep(page, {
  workflowConfigId,
  name,
  code,
  behaviorType,
  behaviorValue,
  nextStepId = ''
}) {
  const body = {
    step: {
      nextStepId,
      name,
      code,
      stepType: STEP_TYPE.ACTION,
      action: {
        belongType: 3,
        behaviorType,
        behaviorValue,
        executeType: 1
      },
      workflowConfigId
    }
  };

  const resp = await apiPost(page, '/api/platform/Workflow/AddWorkflowActionStep', body);
  const success = ok(resp);
  log(`添加动作步骤[${name}]`, { success, message: resp.message || '完成' });
  return {
    success,
    message: success ? `动作步骤[${name}]创建成功` : (resp.message || '创建失败'),
    stepId: success ? resp.data?.step?.id : undefined,
    data: resp.data,
    result: resp
  };
}

// ─── 复制步骤 ────────────────────────────────────────────

/**
 * 复制已有步骤
 *
 * 复制后自动查询步骤列表，根据 stepCode 匹配返回新步骤数据。
 *
 * @param {object} page - Playwright page 对象
 * @param {object} config - 复制配置
 * @param {string} config.stepName - 新步骤名称
 * @param {string} config.stepCode - 新步骤编码
 * @param {string} config.workflowConfigId - 工作流配置 ID
 * @param {string} config.stepId - 要复制的源步骤 ID
 * @returns {Promise<{success: boolean, step?: object, message: string, data?: object, result?: object}>}
 */
async function copyStep(page, {
  stepName,
  stepCode,
  workflowConfigId,
  stepId
}) {
  const resp = await apiPost(page, '/api/platform/Workflow/CopyWorkflowCurrentStep', {
    stepName,
    stepCode,
    workflowConfigId,
    stepId
  });

  const success = ok(resp) && resp.data === true;
  if (!success) {
    log(`复制步骤[${stepName}]`, { success: false, message: resp.message || '复制失败' });
    return { success: false, message: resp.message || '复制失败', result: resp };
  }

  // 复制成功后重新查询步骤列表，根据 stepCode 匹配
  const listResp = await getWorkflowSteps(page, workflowConfigId);
  if (!listResp.success) {
    log(`复制步骤[${stepName}]`, { success: false, message: '复制成功但查询步骤列表失败' });
    return { success: false, message: '复制成功但查询步骤列表失败', result: resp };
  }

  const newStep = listResp.steps.find(s => s.code === stepCode);
  if (!newStep) {
    log(`复制步骤[${stepName}]`, { success: false, message: '复制成功但未在列表中匹配到新步骤' });
    return { success: false, message: '复制成功但未在列表中匹配到新步骤', result: resp };
  }

  log(`复制步骤[${stepName}]`, { success: true, message: `新步骤 ID: ${newStep.id}` });
  return {
    success: true,
    message: `步骤复制成功: ${stepName}`,
    step: newStep,
    data: resp.data,
    result: resp
  };
}

// ─── 更新步骤 ────────────────────────────────────────────

/**
 * 更新审批步骤
 *
 * 先获取现有完整数据，合并 updates 后提交更新。
 *
 * @param {object} page - Playwright page 对象
 * @param {string} stepId - 要更新的步骤 ID
 * @param {object} updates - 要更新的字段（深度合并到现有 step 数据）
 * @param {string} [updates.name] - 步骤名称
 * @param {string} [updates.nextStepId] - 下一步 ID
 * @param {object} [updates.stepTaskConfig] - 任务配置（深度合并）
 * @param {Array} [updates.stepTaskApprovals] - 审批按钮配置（直接替换）
 * @returns {Promise<{success: boolean, message: string, data?: object, result?: object}>}
 */
async function updateTaskStep(page, stepId, updates) {
  const detailResp = await getStepDetail(page, stepId);
  if (!detailResp.success) {
    return { success: false, message: `获取步骤详情失败: ${detailResp.message}`, result: detailResp.result };
  }

  const step = detailResp.data;

  // 合并顶层字段
  if (updates.name !== undefined) step.name = updates.name;
  if (updates.nextStepId !== undefined) step.nextStepId = updates.nextStepId;

  // 合并 stepTaskConfig
  if (updates.stepTaskConfig) {
    step.stepTaskConfig = { ...step.stepTaskConfig, ...updates.stepTaskConfig };
  }

  // 替换 stepTaskApprovals
  if (updates.stepTaskApprovals) {
    step.stepTaskApprovals = updates.stepTaskApprovals;
  }

  const body = { step };

  const resp = await apiPost(page, '/api/platform/Workflow/UpdateWorkflowTaskStep', body);
  const success = ok(resp);
  log(`更新审批步骤[${step.name}]`, { success, message: resp.message || '完成' });
  return {
    success,
    message: success ? `审批步骤更新成功` : (resp.message || '更新失败'),
    data: resp.data,
    result: resp
  };
}

/**
 * 更新判断步骤
 *
 * 先获取现有完整数据，合并 updates 后提交更新。
 *
 * @param {object} page - Playwright page 对象
 * @param {string} stepId - 要更新的步骤 ID
 * @param {object} updates - 要更新的字段
 * @param {string} [updates.name] - 步骤名称
 * @param {string} [updates.nextStepId] - 下一步 ID
 * @param {Array} [updates.decisionRules] - 判断规则（直接替换）
 * @param {string} [updates.elseNextStepId] - 否则下一步 ID
 * @returns {Promise<{success: boolean, message: string, data?: object, result?: object}>}
 */
async function updateDecisionStep(page, stepId, updates) {
  const detailResp = await getStepDetail(page, stepId);
  if (!detailResp.success) {
    return { success: false, message: `获取步骤详情失败: ${detailResp.message}`, result: detailResp.result };
  }

  const step = detailResp.data;

  if (updates.name !== undefined) step.name = updates.name;
  if (updates.nextStepId !== undefined) step.nextStepId = updates.nextStepId;
  if (updates.elseNextStepId !== undefined) step.elseNextStepId = updates.elseNextStepId;
  if (updates.decisionRules !== undefined) step.decisionRules = updates.decisionRules;

  const body = { step };

  const resp = await apiPost(page, '/api/platform/Workflow/UpdateWorkflowDecisionStep', body);
  const success = ok(resp);
  log(`更新判断步骤[${step.name}]`, { success, message: resp.message || '完成' });
  return {
    success,
    message: success ? `判断步骤更新成功` : (resp.message || '更新失败'),
    data: resp.data,
    result: resp
  };
}

/**
 * 更新动作步骤
 *
 * 先获取现有完整数据，合并 updates 后提交更新。
 *
 * @param {object} page - Playwright page 对象
 * @param {string} stepId - 要更新的步骤 ID
 * @param {object} updates - 要更新的字段
 * @param {string} [updates.name] - 步骤名称
 * @param {string} [updates.nextStepId] - 下一步 ID
 * @param {object} [updates.action] - 动作配置（深度合并）
 * @returns {Promise<{success: boolean, message: string, data?: object, result?: object}>}
 */
async function updateActionStep(page, stepId, updates) {
  const detailResp = await getStepDetail(page, stepId);
  if (!detailResp.success) {
    return { success: false, message: `获取步骤详情失败: ${detailResp.message}`, result: detailResp.result };
  }

  const step = detailResp.data;

  if (updates.name !== undefined) step.name = updates.name;
  if (updates.nextStepId !== undefined) step.nextStepId = updates.nextStepId;

  if (updates.action) {
    step.action = { ...step.action, ...updates.action };
  }

  const body = { step };

  const resp = await apiPost(page, '/api/platform/Workflow/UpdateWorkflowActionStep', body);
  const success = ok(resp);
  log(`更新动作步骤[${step.name}]`, { success, message: resp.message || '完成' });
  return {
    success,
    message: success ? `动作步骤更新成功` : (resp.message || '更新失败'),
    data: resp.data,
    result: resp
  };
}

// ─── 查询步骤 ────────────────────────────────────────────

/**
 * 查询工作流所有步骤
 *
 * @param {object} page - Playwright page 对象
 * @param {string} workflowConfigId - 工作流配置 ID
 * @returns {Promise<{success: boolean, steps: Array, message: string, data?: object, result?: object}>}
 */
async function getWorkflowSteps(page, workflowConfigId) {
  const resp = await apiGet(page, `/api/platform/Workflow/GetWorkflowSteps?workflowConfigId=${encodeURIComponent(workflowConfigId)}`);
  const success = ok(resp);
  const steps = success && Array.isArray(resp.data) ? resp.data : [];
  log('查询工作流步骤', { success, message: `共 ${steps.length} 个步骤` });
  return {
    success,
    steps,
    message: success ? `查询到 ${steps.length} 个步骤` : (resp.message || '查询失败'),
    data: resp.data,
    result: resp
  };
}

/**
 * 查询步骤详情（含完整配置）
 *
 * @param {object} page - Playwright page 对象
 * @param {string} stepId - 步骤 ID
 * @returns {Promise<{success: boolean, data?: object, message: string, result?: object}>}
 */
async function getStepDetail(page, stepId) {
  const resp = await apiGet(page, `/api/platform/Workflow/GetWorkflowStepWithDetails?id=${encodeURIComponent(stepId)}`);
  const success = ok(resp);
  log('查询步骤详情', { success, message: resp.message || '完成' });
  return {
    success,
    message: success ? '获取步骤详情成功' : (resp.message || '获取失败'),
    data: success ? resp.data?.step : undefined,
    result: resp
  };
}

module.exports = {
  // 常量
  STEP_TYPE,
  DISPATCH_MODE,
  TASK_REQUIRE_TYPE,
  APPROVAL_BUTTON_STYLE,
  REASON_INPUT_TYPE,
  LOGIC_TYPE,
  // 添加
  addTaskStep,
  addDecisionStep,
  addActionStep,
  // 复制
  copyStep,
  // 更新
  updateTaskStep,
  updateDecisionStep,
  updateActionStep,
  // 查询
  getWorkflowSteps,
  getStepDetail
};

// ─── 独立运行 ────────────────────────────────────────────

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      const { createWorkflow, deleteWorkflow } = require('./create-workflow');
      const { getObjectInfo } = require('./openapi-queries');

      // 获取测试对象
      const info = await getObjectInfo(page, 'test_obj_demo__c');
      if (!info.objectId || !info.lifecycleId) {
        console.log('⚠️ 未找到测试对象 test_obj_demo__c，请先创建对象（node lib/create-object.js）');
        return;
      }

      // 创建工作流
      const testCode = `wf_step_${Date.now()}__c`;
      const wfResult = await createWorkflow(page, {
        name: '测试工作流_步骤模块',
        code: testCode,
        objectId: info.objectId,
        lifecycleId: info.lifecycleId
      });
      if (!wfResult.success) {
        console.log('创建工作流失败:', wfResult.message);
        return;
      }
      const workflowConfigId = wfResult.workflowConfigId;
      console.log(`✅ 工作流已创建: ${workflowConfigId}`);

      // 获取开始步骤的 participantConfig.id 作为 taskAssign
      const stepsResp = await getWorkflowSteps(page, workflowConfigId);
      let participantId;
      if (stepsResp.success && stepsResp.steps.length > 0) {
        const startStep = stepsResp.steps.find(s => s.stepType === STEP_TYPE.START);
        if (startStep) {
          const detail = await getStepDetail(page, startStep.id);
          const pConfig = detail.data?.participantConfig;
          if (pConfig && Array.isArray(pConfig) && pConfig.length > 0) {
            participantId = pConfig[0].id;
            console.log(`✅ 参与者 ID: ${participantId}`);
          }
        }
      }

      // 1. 添加审批步骤
      const taskResult = await addTaskStep(page, {
        workflowConfigId,
        name: '审核',
        code: `shenhe_${Date.now()}__c`,
        taskAssign: participantId || uuid()
      });
      console.log('添加审批步骤:', JSON.stringify(taskResult, null, 2));

      // 2. 添加判断步骤
      if (taskResult.success) {
        const endStep = stepsResp.steps.find(s => s.stepType === STEP_TYPE.END);
        const decisionResult = await addDecisionStep(page, {
          workflowConfigId,
          name: '判断：审核意见',
          code: `panduan_${Date.now()}__c`,
          rules: [
            {
              targetId: taskResult.stepId,
              targetCode: taskResult.data?.code || 'shenhe__c',
              logicType: LOGIC_TYPE.EQUAL,
              logicValue: '"approval-uuid-placeholder"',
              nextStepId: endStep?.id || '',
              conditionLabel: '同意'
            }
          ],
          elseNextStepId: endStep?.id || ''
        });
        console.log('添加判断步骤:', JSON.stringify(decisionResult, null, 2));
      }

      // 3. 添加动作步骤
      const actionResult = await addActionStep(page, {
        workflowConfigId,
        name: '动作：修改状态为草稿',
        code: `dongzuo_${Date.now()}__c`,
        behaviorType: 9,
        behaviorValue: { statusId: '31adf73d-4ec7-f33a-657c-3a2277eff47c' }
      });
      console.log('添加动作步骤:', JSON.stringify(actionResult, null, 2));

      // 4. 查询所有步骤
      const allSteps = await getWorkflowSteps(page, workflowConfigId);
      console.log(`工作流步骤总数: ${allSteps.steps.length}`);
      allSteps.steps.forEach(s => console.log(`  - [${s.stepType}] ${s.name} (${s.id})`));

      // 5. 删除工作流（清理）
      await deleteWorkflow(page, workflowConfigId);
      console.log('✅ 测试工作流已清理');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
