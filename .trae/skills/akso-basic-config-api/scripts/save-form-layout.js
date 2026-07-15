/**
 * akso-basic-config-api — 保存表单布局
 *
 * 支持分区（sections）和控件（controls）的完整结构定义。
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
 * const { saveFormLayout } = require('./save-form-layout');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const result = await saveFormLayout(page, {
 *   objectId: '对象UUID',
 *   objectTypeId: '对象类型UUID',
 *   name: '主表单布局',
 *   code: 'layout_main_form',
 *   sections: [{ id: 'sec_uuid', code: 'sec1__cs', name: '基本信息', type: 1, columnsNum: 2 }],
 *   controls: [{ id: 'ctrl_uuid', sectionId: 'sec_uuid', code: 'no__c', name: '编号', fieldId: '字段UUID', type: '', gridSpan: 1, attrs: {} }]
 * });
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node scripts/save-form-layout.js
 */

const { apiPost, isSuccess } = require('./core');

async function saveFormLayout(page, { objectId, objectTypeId, name, code, sections, controls, layoutId }) {
  const body = {
    id: layoutId || null,
    objectId, objectTypeId, name, code,
    source: 2, status: 1, isMain: true, labelCol: 0,
    sections: sections || [],
    controls: controls || [],
    pages: [], rules: [],
    activePageCode: null, activeSectionCode: null
  };
  const resp = await apiPost(page, '/api/platform/Layout/SaveLayoutDetail', body);
  return {
    success: isSuccess(resp),
    message: isSuccess(resp) ? `布局[${name}]保存成功` : resp.message,
    result: resp
  };
}

module.exports = { saveFormLayout };

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      console.log('表单布局模块就绪 (需提供 objectId / objectTypeId / fieldIds 运行完整演示)');
      console.log('→ 建议使用 orchestrate.js 进行完整工作流演示');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
