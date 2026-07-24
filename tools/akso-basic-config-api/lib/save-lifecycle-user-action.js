/**
 * akso-basic-config-api — 生命周期状态用户动作管理模块
 *
 * 功能：
 *   - 查询生命周期状态的用户动作列表
 *   - 将工作流绑定到生命周期状态（即创建/更新用户动作）
 *
 * ## 关键概念
 *
 * ### 生命周期状态用户动作（LifecycleStatusUserAction）
 * 每个生命周期状态可以绑定多个"用户动作"（按钮），每个动作可配置
 * 不同的行为（behaviorType）。其中 behaviorType=7 表示"发起工作流"，
 * 即用户点击按钮后触发审批工作流。
 *
 * ### bindWorkflowToStatus 合并逻辑
 * 该函数会先查询状态现有的用户动作，然后将新的工作流动作追加到已有
 * 动作列表中，以 PATCH 方式全量提交。这确保了多次调用不会覆盖之前的绑定。
 *
 * @example <caption>为生命周期状态绑定工作流</caption>
 * const { bindWorkflowToStatus } = require('./save-lifecycle-user-action');
 *
 * const result = await bindWorkflowToStatus(page, {
 *   statusId: '31adf73d-4ec7-f33a-657c-3a2277eff47c',
 *   lifecycleId: '3a2277ef-c96c-c5a2-bba8-fdce92269720',
 *   objectId: '3a2277ef-c96c-45a1-8c48-966646732d7d',
 *   objectCode: 'test_999__c',
 *   workflowBasicId: '3a22a587-dd40-da70-67fe-fc0ac9743d84'
 * });
 * console.log(result.message);
 *
 * @example <caption>幂等更新已有动作</caption>
 * // 传入 existingId 等参数，更新已有配置而非新建
 * const result = await bindWorkflowToStatus(page, {
 *   statusId: '...',
 *   lifecycleId: '...',
 *   objectId: '...',
 *   objectCode: '...',
 *   workflowBasicId: '...',
 *   existingId: '8715addb-a281-4e1b-1d99-3a22a5a21009',
 *   existingActionId: '536b94e4-2e2b-f862-ecd7-3a22a5a2101e',
 *   existingConfigId: '02059608-0c36-4101-b7bf-3a22a5a21026'
 * });
 */

const crypto = require('crypto');
const { apiPost, apiPatch, isSuccess } = require('./core');

// ========== 常量 ==========

/** 行为类型 */
const BEHAVIOR_TYPE = {
  START_WORKFLOW: 7    // 发起工作流
};

/** 归属类型 */
const BELONG_TYPE = {
  STATUS: 2            // 生命周期状态
};

// ========== 查询 API ==========

/**
 * 获取生命周期状态的用户动作列表
 *
 * @param {import('playwright').Page} page
 * @param {string} statusId - 生命周期状态 UUID
 * @returns {Promise<{success: boolean, data: object|null, message: string}>}
 */
async function getUserActions(page, statusId) {
  const resp = await apiPost(page, '/api/config/power/LifestatusUserAction/Get', {
    statusId
  });
  return {
    success: isSuccess(resp),
    data: resp.data || null,
    message: isSuccess(resp) ? '获取用户动作成功' : resp.message
  };
}

// ========== 绑定 API ==========

/**
 * 将工作流绑定到生命周期状态
 *
 * 先查询状态现有用户动作，将新的工作流动作追加到已有动作列表中，
 * 以 PATCH 方式全量提交，确保多次调用不会覆盖之前的绑定。
 *
 * @param {import('playwright').Page} page
 * @param {object} config
 * @param {string} config.statusId - 生命周期状态 UUID（必填）
 * @param {string} config.lifecycleId - 生命周期 UUID（必填）
 * @param {string} config.objectId - 对象 UUID（必填）
 * @param {string} config.objectCode - 对象 code（必填）
 * @param {string} config.workflowBasicId - 工作流基础 ID（必填）
 * @param {string} [config.actionName='提交审批'] - 动作显示名称
 * @param {string} [config.actionCode] - 动作编码（不传则自动生成）
 * @param {string} [config.icon='CheckOutlined'] - 动作图标
 * @param {string} [config.description='发起工作流审批'] - 动作描述
 * @param {string} [config.existingId] - 已有用户动作记录 ID（幂等更新用）
 * @param {string} [config.existingActionId] - 已有 action ID（幂等更新用）
 * @param {string} [config.existingConfigId] - 已有 config ID（幂等更新用）
 * @returns {Promise<{success: boolean, message: string, result: object}>}
 */
async function bindWorkflowToStatus(page, {
  statusId,
  lifecycleId,
  objectId,
  objectCode,
  workflowBasicId,
  actionName = '提交审批',
  actionCode,
  icon = 'CheckOutlined',
  description = '发起工作流审批',
  existingId,
  existingActionId,
  existingConfigId
}) {
  // 1. 获取当前已有数据
  const existing = await getUserActions(page, statusId);
  if (!existing.success) {
    return {
      success: false,
      message: `获取已有用户动作失败: ${existing.message}`,
      result: existing
    };
  }

  // 2. 提取已有字段
  const sourceItems = existing.data?.roles?.[0]?.sourceItems || [];
  const observed = existing.data?.roles?.[0]?.__observed || crypto.randomUUID();

  // 3. 确定记录 ID
  const recordId = existingId || (sourceItems.length > 0 ? existing.data?.roles?.[0]?.id : null) || crypto.randomUUID();

  // 4. 确定已有动作列表
  const existingActions = (sourceItems.length > 0 && existing.data?.roles?.[0]?.actions)
    ? existing.data.roles[0].actions
    : [];

  // 5. 构建新的 action
  const newActionId = existingActionId || crypto.randomUUID();
  const newConfigId = existingConfigId || crypto.randomUUID();
  const code = actionCode || `action_${Date.now()}__c`;

  const newAction = {
    id: newActionId,
    sort: existingActions.length, // 排在已有动作之后
    actionSignature: null,
    name: actionName,
    code,
    icon,
    group: 1,
    isCommonly: true,
    isNotShowOperation: false,
    configs: [{
      id: newConfigId,
      behaviorType: BEHAVIOR_TYPE.START_WORKFLOW,
      behaviorValue: {
        workflowId: workflowBasicId,
        isBeforeWorkflowCompleteReminderTask: true
      }
    }],
    isSubmitAndExecute: false,
    isNeedSignature: false,
    __observed: crypto.randomUUID(),
    uuid: newConfigId
  };

  // 6. 合并 actions
  const mergedActions = [...existingActions, newAction];

  // 7. 构建请求体
  const body = {
    id: recordId,
    isEnabled: false,
    belongId: statusId,
    belongType: BELONG_TYPE.STATUS,
    failPrompt: null,
    sort: sourceItems.length > 0 ? sourceItems.length : 2,
    executeType: 1,
    description,
    lifecycleId,
    lifecycleStatusId: statusId,
    executionConditionGroups: [],
    enableExecutionConfirmation: false,
    promptTitle: null,
    promptMessage: null,
    executionPromptConditionGroups: [],
    __observed: observed,
    actions: mergedActions,
    basicObjectId: objectId,
    objectCode,
    enableSignatures: false
  };

  // 8. 提交
  const resp = await apiPatch(page, '/api/config/lifecycle/UserAction/Update', body);

  return {
    success: isSuccess(resp),
    message: isSuccess(resp)
      ? `工作流[${workflowBasicId}]绑定到状态[${statusId}]成功`
      : resp.message,
    result: resp
  };
}

module.exports = {
  getUserActions,
  bindWorkflowToStatus,
  BEHAVIOR_TYPE,
  BELONG_TYPE
};

// ========== 独立运行示例 ==========

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      console.log('生命周期状态用户动作模块就绪');
      console.log('  查询: getUserActions(page, statusId)');
      console.log('  绑定: bindWorkflowToStatus(page, config)');
      console.log('  常量: BEHAVIOR_TYPE, BELONG_TYPE');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
