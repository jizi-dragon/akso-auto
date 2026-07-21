/**
 * akso-basic-config-api — 统一入口（Barrel 聚合）
 * Phase 2 — v0.5.0，模块化架构
 *
 * 聚合导出所有子模块函数，保持与旧 api-helpers.js 完全兼容。
 * 也可直接按需导入子模块：
 *   const { createObject } = require('./scripts/create-object');
 *
 * @example <caption>一键导入全部</caption>
 * const helpers = require('./scripts');
 * await helpers.createObject(page, { name: '...', code: '...' });
 *
 * @example <caption>一键运行演示</caption>
 * // node scripts/index.js
 */

const core = require('./core');
const visibility = require('./visibility');
const createObject = require('./create-object');
const createField = require('./create-field');
const createPicklist = require('./create-picklist');
const saveFormLayout = require('./save-form-layout');
const saveListLayout = require('./save-list-layout');
const createLifecycleStatus = require('./create-lifecycle-status');
const openapiQueries = require('./openapi-queries');

module.exports = {
  ...core,
  ...visibility,
  ...createObject,
  ...createField,
  ...createPicklist,
  ...saveFormLayout,
  ...saveListLayout,
  ...createLifecycleStatus,
  ...openapiQueries
};

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser({ headless: false });
    try {
      const loginResult = await login(page);
      if (!loginResult.success) {
        console.error('❌ 登录失败:', loginResult.url);
        return;
      }
      console.log('✅ 登录成功:', loginResult.url);

      const token = await core.getAuthToken(page);
      console.log(`🔑 Token: ${token ? token.substring(0, 20) + '...' : '(无)'}`);

      const testResult = await createObject.createObject(page, {
        name: '测试对象_Playwright演示',
        code: 'test_obj_playwright_demo__c'
      });
      core.log('创建对象', testResult);

      if (testResult.success) {
        const info = await openapiQueries.getObjectInfo(page, 'test_obj_playwright_demo__c');
        if (info.objectId) {
          const fieldResult = await createField.createTextField(page, {
            objectId: info.objectId,
            name: '测试文本字段',
            code: 'test_text_field__c'
          });
          core.log('创建字段', fieldResult);
        }
      }
    } catch (err) {
      console.error('❌ 执行异常:', err.message);
    } finally {
      await closeBrowser(browser);
      console.log('\n=== 演示结束 ===');
    }
  })();
}
