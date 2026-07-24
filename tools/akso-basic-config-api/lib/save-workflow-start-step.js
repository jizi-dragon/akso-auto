/**
 * akso-basic-config-api — 工作流开始步骤参与者配置
 *
 * 提供工作流开始步骤的参与者（审核人/批准人）配置和连线操作。
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
 * const { configStartStep, getStartStepControls, getStartStepDetail } = require('./save-workflow-start-step');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 *
 * const result = await configStartStep(page, {
 *   workflowConfigId: '3a22a587-dd42-8b31-946e-cf56b215b488',
 *   stepId: '3af8ccb8-3de0-bef9-3b0a-3a22a587dd58',
 *   name: '开始',
 *   code: 'test1111_Start__c',
 *   sort: 1,
 *   nextStepId: 'dad16a19-7971-9c82-8ab9-3a22a58e196c',
 *   nextStepCode: 'shenhe__c',
 *   participants: [
 *     { name: '审核人', code: 'cc__c' },
 *     { name: '批准人', code: 'ss__c' }
 *   ]
 * });
 * console.log(result);
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node lib/save-workflow-start-step.js
 */

const { apiPost, apiGet, isSuccess } = require('./core');
const crypto = require('crypto');

/** 控件类型 */
const CTRL_TYPE = {
  PARTICIPANT: 20
};

/** 选择用户类型 */
const SELECT_USER_TYPE = {
  SPECIFIED: 10
};

/**
 * 获取开始步骤详情（含 startUpControls）
 *
 * @param {object} page - Playwright page 对象
 * @param {string} stepId - 步骤 ID
 * @returns {Promise<{success: boolean, message: string, data?: object, result?: object}>}
 */
async function getStartStepDetail(page, stepId) {
  const resp = await apiGet(page, `/api/platform/Workflow/GetWorkflowStepWithDetails?id=${stepId}`);
  const ok = isSuccess(resp);
  return {
    success: ok,
    message: ok ? '获取开始步骤详情成功' : (resp.message || '获取失败'),
    data: resp.data,
    result: resp
  };
}

/**
 * 获取开始步骤控件列表
 *
 * @param {object} page - Playwright page 对象
 * @param {string} workflowConfigId - 工作流配置 ID
 * @param {string} stepId - 开始步骤 ID
 * @returns {Promise<{success: boolean, message: string, controls?: Array, data?: object, result?: object}>}
 */
async function getStartStepControls(page, workflowConfigId, stepId) {
  const resp = await apiGet(page, `/api/platform/Workflow/GetWorkflowStepControls?workflowConfigId=${workflowConfigId}&stepId=${stepId}`);
  const ok = isSuccess(resp);
  return {
    success: ok,
    message: ok ? '获取开始步骤控件成功' : (resp.message || '获取失败'),
    controls: resp.data || [],
    data: resp.data,
    result: resp
  };
}

/**
 * 配置工作流开始步骤参与者及下游连线
 *
 * 先拉取步骤完整现有数据，再用传入的 participants 构建 startUpControls 合并后提交。
 *
 * @param {object} page - Playwright page 对象
 * @param {object} config - 开始步骤配置
 * @param {string} config.workflowConfigId - 工作流配置 ID
 * @param {string} config.stepId - 开始步骤 ID
 * @param {string} config.name - 步骤名称
 * @param {string} config.code - 步骤编码
 * @param {number} config.sort - 排序号
 * @param {string} [config.nextStepId] - 下一节点步骤 ID（不传则保留现有值）
 * @param {string} [config.nextStepCode] - 下一节点步骤编码（不传则保留现有值）
 * @param {Array<{name: string, code?: string, selectUserType?: number, allowRoleIds?: string[], excludeRoleIds?: string[]}>} config.participants - 参与者列表
 * @returns {Promise<{success: boolean, message: string, data?: object, result?: object}>}
 */
async function configStartStep(page, config) {
  const {
    workflowConfigId,
    stepId,
    name,
    code,
    sort,
    nextStepId,
    nextStepCode,
    participants = []
  } = config;

  // 1. 获取开始步骤的完整现有数据
  const detailResp = await getStartStepDetail(page, stepId);
  if (!detailResp.success) {
    return {
      success: false,
      message: `获取开始步骤详情失败: ${detailResp.message}`,
      result: detailResp.result
    };
  }

  const existingData = detailResp.data || {};
  const existingStep = existingData.step || existingData;

  // 2. 构建 startUpControls（如 participants 为空则保留现有）
  const existingControls = existingStep.startUpControls || [];
  let startUpControls;
  if (participants.length === 0) {
    startUpControls = existingControls;
  } else {
    // 按 name 匹配：保留已有控件的 UUID，仅新增/更新字段
    startUpControls = participants.map((p, index) => {
      const existing = existingControls.find(c => c.participantConfig?.name === p.name);
      return {
        controlConfig: {
          ctrlType: CTRL_TYPE.PARTICIPANT,
          code: existing?.controlConfig?.code || p.code || crypto.randomUUID(),
          stepId,
          workflowConfigId,
          sort: index + 1,
          id: existing?.controlConfig?.id,
          name: existing?.controlConfig?.name,
          isRequired: existing?.controlConfig?.isRequired ?? false,
          value: existing?.controlConfig?.value,
          dispatchMode: existing?.controlConfig?.dispatchMode ?? 10,
          taskRequireType: existing?.controlConfig?.taskRequireType ?? 20,
          isHidden: existing?.controlConfig?.isHidden ?? false,
          stepTaskId: existing?.controlConfig?.stepTaskId ?? null,
          remark: existing?.controlConfig?.remark ?? null
        },
        participantConfig: {
          name: p.name,
          selectUserType: p.selectUserType ?? (existing?.participantConfig?.selectUserType ?? SELECT_USER_TYPE.SPECIFIED),
          allowRoleIds: p.allowRoleIds || existing?.participantConfig?.allowRoleIds || [],
          excludeRoleIds: p.excludeRoleIds || existing?.participantConfig?.excludeRoleIds || [],
          id: existing?.participantConfig?.id || crypto.randomUUID(),
          isUseShareSetting: existing?.participantConfig?.isUseShareSetting ?? false,
          isUseUserGroup: existing?.participantConfig?.isUseUserGroup ?? false,
          functionId: existing?.participantConfig?.functionId ?? null,
          functionName: existing?.participantConfig?.functionName ?? null,
          isRequired: existing?.participantConfig?.isRequired ?? false,
          remark: existing?.participantConfig?.remark ?? null,
          companyFieldType: existing?.participantConfig?.companyFieldType ?? null,
          condition: existing?.participantConfig?.condition ?? null,
          listLayoutCode: existing?.participantConfig?.listLayoutCode ?? null,
          code: existing?.participantConfig?.code ?? null,
          isExcludeWorkflowStartUserId: existing?.participantConfig?.isExcludeWorkflowStartUserId ?? false,
          isUseRoleAsSignalMean: existing?.participantConfig?.isUseRoleAsSignalMean ?? false
        },
        id: existing?.id,
        name: existing?.name,
        sort: existing?.sort ?? (index + 1)
      };
    });
  }

  // 3. 合并 step 字段：保留原有字段，覆盖需要变更的部分
  const step = {
    id: existingStep.id,
    code: existingStep.code,
    stepType: existingStep.stepType,
    isEnable: existingStep.isEnable ?? true,
    createdBy: existingStep.createdBy,
    createdTime: existingStep.createdTime,
    modifiedBy: existingStep.modifiedBy,
    modifiedTime: existingStep.modifiedTime,
    isDeleted: existingStep.isDeleted ?? false,
    name: name || existingStep.name,
    workflowConfigId: workflowConfigId || existingStep.workflowConfigId,
    sort: sort ?? existingStep.sort,
    remark: existingStep.remark ?? null,
    stepStartConfig: existingStep.stepStartConfig ?? null,
    stepRuleConfig: existingStep.stepRuleConfig ?? [],
    nextStepList: existingStep.nextStepList ?? [],
    nextStepId: nextStepId ?? existingStep.nextStepId ?? null,
    nextStepCode: nextStepCode ?? existingStep.nextStepCode ?? null,
    nextStepName: existingStep.nextStepName ?? null,
    startUpControls
  };

  // 4. 提交
  const resp = await apiPost(page, '/api/platform/Workflow/UpdateWorkflowStartStep', { step });
  const ok = isSuccess(resp);

  return {
    success: ok,
    message: ok
      ? `开始步骤[${name}]参与者配置成功 (${participants.length} 个参与者)`
      : (resp.message || '配置失败'),
    data: resp.data,
    result: resp
  };
}

module.exports = {
  configStartStep,
  getStartStepControls,
  getStartStepDetail,
  CTRL_TYPE,
  SELECT_USER_TYPE
};

// --- 独立运行演示 ---
if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      console.log('✅ 工作流开始步骤模块就绪');
      console.log('  导出函数: configStartStep, getStartStepControls, getStartStepDetail');
      console.log('  导出常量: CTRL_TYPE, SELECT_USER_TYPE');
      console.log('→ 建议使用 orchestrate.js 进行完整工作流演示');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
