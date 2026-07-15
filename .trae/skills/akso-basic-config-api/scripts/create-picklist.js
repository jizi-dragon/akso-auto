/**
 * akso-basic-config-api — 创建选项集
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
 * const { createPicklist } = require('./create-picklist');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const result = await createPicklist(page, {
 *   name: '变更类型', code: 'change_type__c',
 *   options: [
 *     { name: '主要变更', code: 'major__c', status: 1, operations: 1, sort: 0 },
 *     { name: '次要变更', code: 'minor__c', status: 1, operations: 1, sort: 1 }
 *   ]
 * });
 * console.log(result); // → { success: true, message: '选项集[变更类型]创建成功' }
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node scripts/create-picklist.js
 */

const { apiPost, isSuccess } = require('./core');

async function createPicklist(page, { name, code, options }) {
  const body = { name, code, options };
  const resp = await apiPost(page, '/api/platform/ObjectPicklist/save', body);
  return {
    success: isSuccess(resp),
    message: isSuccess(resp) ? `选项集[${name}]创建成功` : resp.message,
    result: resp
  };
}

module.exports = { createPicklist };

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      const result = await createPicklist(page, {
        name: '测试选项集_模块演示', code: 'test_pl_demo__c',
        options: [
          { name: '选项A', code: 'opt_a__c', status: 1, operations: 1, sort: 0 },
          { name: '选项B', code: 'opt_b__c', status: 1, operations: 1, sort: 1 },
          { name: '选项C', code: 'opt_c__c', status: 1, operations: 1, sort: 2 }
        ]
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
