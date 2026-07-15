/**
 * akso-basic-config-api — 保存列表布局（两步创建）
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
 * const { saveListLayout, addListColumns } = require('./save-list-layout');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const r = await saveListLayout(page, { name: '变更列表', code: 'list_change_list', objectId: '...', objectTypeId: '...' });
 * if (r.success) {
 *   await addListColumns(page, r.layoutId, [
 *     { fieldId: '...', fieldPath: 'no__c', sort: 1 },
 *     { fieldId: '...', fieldPath: 'title__c', sort: 2 }
 *   ]);
 * }
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node scripts/save-list-layout.js
 */

const { apiPost, isSuccess } = require('./core');

async function saveListLayout(page, { name, code, objectId, objectTypeId }) {
  const resp = await apiPost(page, '/api/platform/Listlayout/Save', {
    status: 1, source: 3, sortFields: [], name, code, objectTypeId, objectId
  });
  return {
    success: isSuccess(resp),
    layoutId: resp.data?.id || resp.data,
    message: isSuccess(resp) ? `列表[${name}]创建成功` : resp.message,
    result: resp
  };
}

async function addListColumns(page, listlayoutId, columns) {
  const resp = await apiPost(page, '/api/platform/Listlayout/AddColumns', {
    listlayoutId, listlayoutColumns: columns
  });
  return {
    success: isSuccess(resp),
    message: isSuccess(resp) ? '列添加成功' : resp.message,
    result: resp
  };
}

module.exports = { saveListLayout, addListColumns };

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      console.log('列表布局模块就绪 (需提供 objectId / objectTypeId / fieldIds 运行完整演示)');
      console.log('→ 建议使用 orchestrate.js 进行完整工作流演示');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
