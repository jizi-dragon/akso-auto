/**
 * akso-basic-config-api — 创建生命周期状态
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
 * const { createLifecycleStatus } = require('./create-lifecycle-status');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const statuses = [
 *   { name: '草稿', code: 'status_draft__c' },
 *   { name: '待审批', code: 'status_pending__c' },
 *   { name: '已完成', code: 'status_done__c' },
 *   { name: '已关闭', code: 'status_closed__c' }
 * ];
 * for (const s of statuses) {
 *   const r = await createLifecycleStatus(page, { lifecycleId: '生命周期UUID', ...s });
 *   console.log(r.message);
 * }
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node scripts/create-lifecycle-status.js
 */

const { apiPost, isSuccess } = require('./core');

async function createLifecycleStatus(page, { lifecycleId, name, code, isEnabled = true }) {
  const resp = await apiPost(page, '/api/config/lifecycle/Status/Create', {
    code, name, lifecycleId, isEnabled,
    description: '', source: 3, isRecordDeactivate: false,
    workflowCancelStatus: '11515107-dce6-4ef1-8d51-b1ffed22040f'
  });
  return {
    success: isSuccess(resp),
    statusId: resp.data,
    message: isSuccess(resp) ? `状态[${name}]创建成功` : resp.message,
    result: resp
  };
}

module.exports = { createLifecycleStatus };

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      console.log('生命周期状态模块就绪 (需提供 lifecycleId 运行完整演示)');
      console.log('→ 建议使用 orchestrate.js 进行完整工作流演示');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
