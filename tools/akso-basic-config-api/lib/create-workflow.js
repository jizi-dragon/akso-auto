/**
 * akso-basic-config-api — 工作流基础信息 CRUD
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
 * const { createWorkflow, listWorkflows, deleteWorkflow } = require('./create-workflow');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const result = await createWorkflow(page, {
 *   name: '文档审批工作流_ai测试',
 *   code: 'test1111__c',
 *   objectId: '3a2277ef-c96c-45a1-8c48-966646732d7d',
 *   lifecycleId: '3a2277ef-c96c-c5a2-bba8-fdce92269720'
 * });
 * console.log(result); // → { success: true, workflowConfigId: '...', workflowBasicId: '...' }
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node lib/create-workflow.js
 */

const { apiPost, apiGet, isSuccess } = require('./core');

/** 工作流状态枚举 */
const WORKFLOW_STATUS = {
  DRAFT: 10,
  ENABLED: 20
};

/** 工作流类型枚举 */
const WORKFLOW_TYPE = {
  RECORD: 10
};

/**
 * 创建工作流
 *
 * @param {object} page - Playwright page 对象
 * @param {object} config - 工作流配置
 * @param {string} config.name - 工作流名称
 * @param {string} config.code - 工作流编码（__c 结尾）
 * @param {string} config.objectId - 所属对象 UUID
 * @param {string} config.lifecycleId - 生命周期 UUID
 * @param {number} [config.workflowType=10] - 工作流类型（10=记录工作流）
 * @param {boolean} [config.isSingleRecord=true] - 是否单记录
 * @returns {Promise<{success: boolean, workflowConfigId?: string, workflowBasicId?: string, data?: object, result?: object}>}
 */
async function createWorkflow(page, {
  name,
  code,
  objectId,
  lifecycleId,
  workflowType = WORKFLOW_TYPE.RECORD,
  isSingleRecord = true
}) {
  const resp = await apiPost(page, '/api/platform/Workflow/AddWorkflowBasic', {
    basicConfig: {
      name,
      code,
      status: WORKFLOW_STATUS.DRAFT,
      objectId,
      lifecycleId,
      workflowType,
      isSingleRecord
    },
    variables: []
  });

  const ok = isSuccess(resp);
  return {
    success: ok,
    message: ok ? `工作流[${name}]创建成功` : (resp.message || '创建失败'),
    workflowConfigId: ok ? resp.data?.basicConfig?.id : undefined,
    workflowBasicId: ok ? resp.data?.basicConfig?.workflowBasicId : undefined,
    data: resp.data,
    result: resp
  };
}

/**
 * 获取工作流详情
 *
 * @param {object} page - Playwright page 对象
 * @param {string} workflowConfigId - 工作流配置 ID
 * @returns {Promise<{success: boolean, data?: object, result?: object}>}
 */
async function getWorkflow(page, workflowConfigId) {
  const resp = await apiGet(page, `/api/platform/Workflow/GetWorkflowBasic?id=${workflowConfigId}`);
  const ok = isSuccess(resp);
  return {
    success: ok,
    message: ok ? '获取工作流成功' : (resp.message || '获取失败'),
    data: resp.data,
    result: resp
  };
}

/**
 * 分页查询工作流列表
 *
 * @param {object} page - Playwright page 对象
 * @param {object} [filters] - 过滤条件
 * @param {number} [filters.pageIndex=1] - 页码
 * @param {number} [filters.pageSize=20] - 每页条数
 * @param {Array} [filters.filters=[]] - 过滤条件数组
 * @returns {Promise<{success: boolean, list?: Array, total?: number, data?: object, result?: object}>}
 */
async function listWorkflows(page, filters = {}) {
  const body = {
    pageIndex: filters.pageIndex || 1,
    filters: filters.filters || [],
    pageSize: filters.pageSize || 20
  };
  const resp = await apiPost(page, '/api/platform/Workflow/GetWorkflowBasicPageViewList', body);
  const ok = isSuccess(resp);
  return {
    success: ok,
    message: ok ? `查询到 ${resp.data?.totalCount || 0} 个工作流` : (resp.message || '查询失败'),
    list: resp.data?.items || [],
    total: resp.data?.totalCount || 0,
    data: resp.data,
    result: resp
  };
}

/**
 * 变更工作流状态
 *
 * @param {object} page - Playwright page 对象
 * @param {string} workflowConfigId - 工作流配置 ID
 * @param {string} workflowBasicId - 工作流基础 ID
 * @param {number} status - 目标状态（10=草稿, 20=启用）
 * @returns {Promise<{success: boolean, result?: object}>}
 */
async function changeWorkflowStatus(page, workflowConfigId, workflowBasicId, status) {
  const resp = await apiPost(page, '/api/platform/Workflow/ChangeWorkflowBasicStatus', {
    ids: [workflowConfigId],
    status,
    workflowBasicId
  });
  const ok = isSuccess(resp);
  return {
    success: ok,
    message: ok ? '工作流状态变更成功' : (resp.message || '变更失败'),
    result: resp
  };
}

/**
 * 删除工作流
 *
 * 注意：使用 apiPost 发送请求体，因为 apiDelete 不支持 body。
 *
 * @param {object} page - Playwright page 对象
 * @param {string} workflowConfigId - 工作流配置 ID
 * @returns {Promise<{success: boolean, result?: object}>}
 */
async function deleteWorkflow(page, workflowConfigId) {
  const resp = await apiPost(page, '/api/platform/Workflow/DeleteWorkflowBasic', {
    id: workflowConfigId
  });
  const ok = isSuccess(resp);
  return {
    success: ok,
    message: ok ? '工作流删除成功' : (resp.message || '删除失败'),
    result: resp
  };
}

module.exports = {
  createWorkflow,
  getWorkflow,
  listWorkflows,
  changeWorkflowStatus,
  deleteWorkflow,
  WORKFLOW_STATUS,
  WORKFLOW_TYPE
};

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      const { getObjectInfo } = require('./openapi-queries');

      // 获取测试对象的 objectId 和 lifecycleId
      const info = await getObjectInfo(page, 'test_obj_demo__c');
      if (!info.objectId || !info.lifecycleId) {
        console.log('⚠️ 未找到测试对象 test_obj_demo__c，请先创建对象（node lib/create-object.js）');
        return;
      }

      const testCode = `wf_test_${Date.now()}__c`;

      // 1. 创建工作流
      const createResult = await createWorkflow(page, {
        name: '测试工作流_模块演示',
        code: testCode,
        objectId: info.objectId,
        lifecycleId: info.lifecycleId
      });
      console.log('创建工作流:', JSON.stringify(createResult, null, 2));

      if (createResult.success) {
        // 2. 获取工作流详情
        const getResult = await getWorkflow(page, createResult.workflowConfigId);
        console.log('获取工作流:', JSON.stringify(getResult, null, 2));

        // 3. 查询工作流列表
        const listResult = await listWorkflows(page, { pageSize: 5 });
        console.log('工作流列表 (total):', listResult.total);

        // 4. 变更状态为启用
        const statusResult = await changeWorkflowStatus(
          page, createResult.workflowConfigId, createResult.workflowBasicId, WORKFLOW_STATUS.ENABLED
        );
        console.log('启用工作流:', JSON.stringify(statusResult, null, 2));

        // 5. 删除工作流
        const deleteResult = await deleteWorkflow(page, createResult.workflowConfigId);
        console.log('删除工作流:', JSON.stringify(deleteResult, null, 2));
      }
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
