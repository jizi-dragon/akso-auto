/**
 * akso-basic-config-api — 核心工具模块
 *
 * 提供 API 调用的底层能力：认证、HTTP 请求、响应校验、日志。
 * 本模块不依赖 shared/browser-manager.js，仅需 page 参数。
 *
 * @example <caption>在功能模块中使用</caption>
 * const { apiPost, isSuccess, log } = require('./core');
 * const resp = await apiPost(page, '/api/platform/BasicObject/SaveBasicObject', { ... });
 * if (isSuccess(resp)) log('创建对象', { success: true, message: '成功' });
 *
 * @example <caption>独立使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
 * const { apiPost, getAuthToken, log } = require('./core');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const result = await apiPost(page, '/api/platform/BasicObject/SaveBasicObject', { name: '测试' });
 * await closeBrowser(browser);
 */

const BASE = 'https://standard-val.aksoegmp.com';
const OPENAPI_BASE = '/api/openapi/v1.0';

const ERROR_CODES = {
  0: '成功',
  401: '无权限/登录过期',
  403: '未访问到',
  500: '统一错误',
  518: '配置迁移',
  1000: '参数验证错误',
  10000: '授权码无效'
};

async function getAuthToken(page) {
  const cookies = await page.context().cookies();
  const token = cookies.find(c => c.name === '__auth_token__')?.value;
  return token;
}

async function apiPost(page, apiPath, body) {
  const token = await getAuthToken(page);
  return page.evaluate(async ({ apiPath, body, token, baseUrl }) => {
    const resp = await fetch(baseUrl + apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(body)
    });
    return resp.json();
  }, { apiPath, body, token, baseUrl: BASE });
}

async function apiGet(page, apiPath) {
  const token = await getAuthToken(page);
  return page.evaluate(async ({ apiPath, token, baseUrl }) => {
    const resp = await fetch(baseUrl + apiPath, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    return resp.json();
  }, { apiPath, token, baseUrl: BASE });
}

function isSuccess(resp) {
  return resp && resp.code === 0;
}

function log(step, result) {
  console.log(`${result.success ? '✅' : '❌'} [${step}] ${result.message}`);
  if (!result.success && result.result) {
    console.log('  ', JSON.stringify(result.result));
  }
}

module.exports = {
  BASE, OPENAPI_BASE, ERROR_CODES,
  getAuthToken, apiPost, apiGet, isSuccess, log
};
