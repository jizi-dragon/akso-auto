/**
 * akso-basic-config-api — 创建对象
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
 * const { createObject } = require('./create-object');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const result = await createObject(page, {
 *   name: '变更控制',
 *   code: 'change_control__c',
 *   enableLifeCycle: true
 * });
 * console.log(result); // → { success: true, message: '对象创建成功' }
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node scripts/create-object.js
 */

const { apiPost, isSuccess } = require('./core');

async function createObject(page, { name, code, enableLifeCycle = true }) {
  const resp = await apiPost(page, '/api/platform/BasicObject/SaveBasicObject', {
    name, code, source: 3, status: 1, objectClass: 1,
    enableLifeCycle, enableSignatures: false, summaryFields: []
  });
  return {
    success: isSuccess(resp),
    message: resp.message || (isSuccess(resp) ? '对象创建成功' : '失败'),
    result: resp
  };
}

module.exports = { createObject };

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      const result = await createObject(page, { name: '测试对象_模块演示', code: 'test_obj_demo__c' });
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
