/**
 * akso-basic-config-api — OpenAPI 查询辅助层
 *
 * 基于标准API文档-V1.0，提供 5 个查询/验证接口。
 * 与管理端 API 分工：管理端 API 用于创建/修改，OpenAPI 用于查询/验证。
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
 * const { getObjectInfo, getFieldList, getLifecycleStatus } = require('./openapi-queries');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const obj = await getObjectInfo(page, 'change_control__c');
 * console.log('objectId:', obj.objectId, 'lifecycleId:', obj.lifecycleId);
 * const fields = await getFieldList(page, 'change_control__c');
 * console.log('字段数:', fields.count);
 * const statuses = await getLifecycleStatus(page, 'change_control__c');
 * console.log('状态数:', statuses.count);
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node scripts/openapi-queries.js
 */

const { apiPost, apiGet, BASE, OPENAPI_BASE, ERROR_CODES } = require('./core');

async function getOpenApiToken(page, account, password) {
  return page.evaluate(async ({ account, password, baseUrl, openApiBase, errorCodes }) => {
    const resp = await fetch(baseUrl + openApiBase + '/Auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password })
    });
    const json = await resp.json();
    return {
      success: json.code === 0,
      token: json.code === 0 ? json.data : null,
      message: json.message || errorCodes[json.code] || '未知错误',
      result: json
    };
  }, { account, password, baseUrl: BASE, openApiBase: OPENAPI_BASE, errorCodes: ERROR_CODES });
}

async function getObjectInfo(page, objectCode) {
  const json = await apiGet(page, OPENAPI_BASE + '/BasicObject/' + objectCode);
  return {
    success: json.code === 0,
    objectId: json.code === 0 ? json.data?.id : null,
    lifecycleId: json.code === 0 ? json.data?.lifeCycleId : null,
    enableLifeCycle: json.code === 0 ? json.data?.enableLifeCycle : null,
    data: json.data || {},
    message: json.message || ERROR_CODES[json.code] || '未知错误',
    result: json
  };
}

async function getFieldList(page, objectCode, fieldCode) {
  const path = fieldCode
    ? OPENAPI_BASE + '/BasicObject/field/' + objectCode + '/' + fieldCode
    : OPENAPI_BASE + '/BasicObject/field/' + objectCode;
  const json = await apiGet(page, path);
  return {
    success: json.code === 0,
    items: json.data || [],
    count: (json.data || []).length,
    message: json.message || ERROR_CODES[json.code] || '未知错误',
    result: json
  };
}

async function getPicklistOptions(page, code) {
  const json = await apiGet(page, OPENAPI_BASE + '/BasicObject/picklist/' + code);
  return {
    success: json.code === 0,
    items: json.data || [],
    count: (json.data || []).length,
    message: json.message || ERROR_CODES[json.code] || '未知错误',
    result: json
  };
}

async function getLifecycleStatus(page, objectCode) {
  const json = await apiGet(page, OPENAPI_BASE + '/BasicObject/lifecycleStatus/' + objectCode);
  return {
    success: json.code === 0,
    items: json.data || [],
    count: (json.data || []).length,
    message: json.message || ERROR_CODES[json.code] || '未知错误',
    result: json
  };
}

module.exports = {
  getOpenApiToken, getObjectInfo, getFieldList, getPicklistOptions, getLifecycleStatus
};

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      console.log('OpenAPI 查询模块就绪');
      console.log('示例: await getObjectInfo(page, \'已知对象code\') → 返回 objectId / lifecycleId');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
