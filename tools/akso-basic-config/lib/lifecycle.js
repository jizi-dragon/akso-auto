/**
 * Akso eGMP 生命周期配置统一入口模块
 *
 * 集成了生命周期全部 4 个核心操作：
 *   1. 创建状态 (createStatus)
 *   2. 创建进入条件 (createEntryCondition)
 *   3. 创建进入动作 (createEntryReaction)
 *   4. 创建用户动作 (createUserAction)
 *
 * 核心发现：所有子页面可通过 URL 直达，无需在 UI 上逐层点击：
 *   创建状态   → /lifecycle/{lifecycleId}/status/00000000-...-0000
 *   进入条件    → .../status/{statusId}/entry-condition/00000000-...-0000?__edit=1
 *   进入动作    → .../status/{statusId}/entry-reaction/00000000-...-0000?__edit=1
 *   用户动作    → .../status/{statusId}/entry-action/00000000-...-0000?__edit=1
 *
 * 用法（模块调用）：
 *   const lifecycle = require('./lifecycle.js');
 *
 *   const r1 = await lifecycle.createStatus(page, { lifecycleId, name, code });
 *   const r2 = await lifecycle.createEntryCondition(page, { lifecycleId, statusId: r1.statusId, ... });
 *   const r3 = await lifecycle.createEntryReaction(page, { lifecycleId, statusId: r1.statusId, ... });
 *   const r4 = await lifecycle.createUserAction(page, { lifecycleId, statusId: r1.statusId, ... });
 *
 * 用法（编排示例 — 创建完整生命周期状态）：
 *   const lifecycle = require('./lifecycle.js');
 *   const status1 = await lifecycle.createStatus(page, {
 *     lifecycleId: 'xxx',
 *     name: '步骤1', code: 'status_step1__c', desc: '第一个步骤'
 *   });
 *   // 为步骤1配置进入条件和进入动作
 *   await lifecycle.createEntryCondition(page, {
 *     lifecycleId, statusId: status1.statusId,
 *     condField: '用餐标题', condOperator: '等于',
 *     errorMsg: '请完善用餐标题信息'
 *   });
 *   await lifecycle.createEntryReaction(page, {
 *     lifecycleId, statusId: status1.statusId,
 *     desc: '进入步骤1自动发通知', actionType: '发送通知',
 *     actionSub: { template: 'QMS待办任务通知', recipient: '查看者' }
 *   });
 *
 * 返回格式：{ success: boolean, [id]: string, message: string }
 */

const { createStatus } = require('./lifecycle-create-state.js');
const { createEntryCondition, selectAntOption } = require('./lifecycle-entry-condition.js');
const { createEntryReaction } = require('./lifecycle-entry-reaction.js');
const { createUserAction } = require('./lifecycle-entry-action.js');

module.exports = {
  createStatus,
  createEntryCondition,
  createEntryReaction,
  createUserAction,

  /** 导出 selectAntOption 供外部复用（解决 Select 下拉重叠） */
  selectAntOption
};
