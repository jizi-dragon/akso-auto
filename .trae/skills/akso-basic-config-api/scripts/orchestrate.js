/**
 * akso-basic-config-api — 编排器
 *
 * 串联所有功能模块为完整配置工作流，提供 "一键配置" 能力。
 * 使用 shared/browser-manager.js 管理浏览器生命周期。
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
 * const { runFullWorkflow } = require('./scripts/orchestrate');
 *
 * const blueprint = {
 *   object: { name: '变更控制', code: 'change_control__c', enableLifeCycle: true },
 *   fields: [
 *     { name: '编号', code: 'no__c', dataType: 1, isRequired: true },
 *     { name: '标题', code: 'title__c', dataType: 1, isRequired: true },
 *     { name: '日期', code: 'happen_date__c', dataType: 5 }
 *   ],
 *   layouts: { formName: '变更主布局', listName: '变更列表' }
 * };
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * const result = await runFullWorkflow(page, blueprint);
 * await closeBrowser(browser);
 *
 * @example <caption>一键运行演示（内置 blueprint）</caption>
 * // node scripts/orchestrate.js
 */

const { login } = require('../../../../shared/browser-manager');
const { createObject } = require('./create-object');
const { createTextField, queryFields } = require('./create-field');
const { saveFormLayout } = require('./save-form-layout');
const { saveListLayout, addListColumns } = require('./save-list-layout');
const { createLifecycleStatus } = require('./create-lifecycle-status');
const { createPicklist } = require('./create-picklist');
const { getObjectInfo, getFieldList, getLifecycleStatus } = require('./openapi-queries');
const { log } = require('./core');

async function runFullWorkflow(page, config) {
  const summary = { steps: [], success: true };
  const { object: objConf, fields = [], options: picklists = [], layouts } = config;

  try {
    log('编排器', { success: true, message: '开始执行配置工作流' });

    // 1. 创建选项集（如需要）
    if (picklists.length > 0) {
      for (const pl of picklists) {
        const plResult = await createPicklist(page, pl);
        log(`选项集:${pl.name}`, plResult);
        summary.steps.push({ step: 'picklist', name: pl.name, success: plResult.success });
      }
    }

    // 2. 创建对象
    const objResult = await createObject(page, objConf);
    log('创建对象', objResult);
    summary.steps.push({ step: 'object', name: objConf.name, success: objResult.success });
    if (!objResult.success) throw new Error('对象创建失败');

    // 3. 获取 objectId
    const info = await getObjectInfo(page, objConf.code);
    log('获取对象信息', { success: info.success, message: info.objectId ? `objectId: ${info.objectId.substring(0, 8)}...` : '失败' });
    summary.objectId = info.objectId;
    summary.lifecycleId = info.lifecycleId;

    // 4. 批量创建字段
    for (const f of fields) {
      const fResult = await createTextField(page, {
        objectId: info.objectId,
        name: f.name, code: f.code,
        dataType: f.dataType || 1,
        isRequired: f.isRequired ?? false
      });
      log(`字段:${f.name}`, fResult);
      summary.steps.push({ step: 'field', name: f.name, success: fResult.success });
    }

    // 5. 创建表单布局（如需要）
    if (layouts && layouts.formName) {
      const fieldItems = await queryFields(page, info.objectId);
      const controls = fieldItems.items.map((item, i) => ({
        id: `ctrl_${i}_${Date.now()}`,
        sectionId: 'sec_main',
        code: item.code,
        name: item.name,
        fieldId: item.id,
        type: '',
        gridSpan: 1,
        attrs: {}
      }));
      const formResult = await saveFormLayout(page, {
        objectId: info.objectId,
        objectTypeId: info.objectId,
        name: layouts.formName,
        code: `layout_${objConf.code.replace(/__c$/, '')}`,
        sections: [{ id: 'sec_main', code: 'sec_main__cs', name: '基本信息', type: 1, columnsNum: 2 }],
        controls
      });
      log('表单布局', formResult);
      summary.steps.push({ step: 'formLayout', success: formResult.success });
    }

    // 6. 创建列表布局（如需要）
    if (layouts && layouts.listName) {
      const fieldItems = await queryFields(page, info.objectId);
      const listResult = await saveListLayout(page, {
        name: layouts.listName,
        code: `list_${objConf.code.replace(/__c$/, '')}`,
        objectId: info.objectId,
        objectTypeId: info.objectId
      });
      if (listResult.success) {
        const cols = fieldItems.items.slice(0, 4).map((item, i) => ({
          fieldId: item.id, fieldPath: item.code, sort: i + 1
        }));
        await addListColumns(page, listResult.layoutId, cols);
      }
      log('列表布局', listResult);
      summary.steps.push({ step: 'listLayout', success: listResult.success });
    }

    // 7. 创建生命周期状态（如启用了生命周期）
    if (config.object.enableLifeCycle && info.lifecycleId) {
      const statuses = [
        { name: '草稿', code: 'status_draft__c' },
        { name: '待审批', code: 'status_pending__c' },
        { name: '已完成', code: 'status_done__c' },
        { name: '已关闭', code: 'status_closed__c' }
      ];
      for (const s of statuses) {
        const stResult = await createLifecycleStatus(page, { lifecycleId: info.lifecycleId, ...s });
        log(`状态:${s.name}`, stResult);
        summary.steps.push({ step: 'lifecycleStatus', name: s.name, success: stResult.success });
      }
    }

    // 8. 验证
    const verifyFields = await getFieldList(page, objConf.code);
    const verifyStatuses = config.object.enableLifeCycle
      ? await getLifecycleStatus(page, objConf.code)
      : { count: 0 };

    summary.fieldCount = verifyFields.count;
    summary.statusCount = verifyStatuses.count;
    log('编排器', { success: true, message: `完成 — ${summary.fieldCount} 个字段, ${summary.statusCount} 个状态` });
  } catch (e) {
    summary.success = false;
    summary.error = e.message;
    log('编排器', { success: false, message: e.message });
  }

  return summary;
}

module.exports = { runFullWorkflow };

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);

      const blueprint = {
        object: { name: '编排器演示对象', code: 'orchestrator_demo__c', enableLifeCycle: true },
        fields: [
          { name: '编号', code: 'demo_no__c', dataType: 1, isRequired: true },
          { name: '标题', code: 'demo_title__c', dataType: 1, isRequired: true }
        ],
        layouts: { formName: '演示主布局', listName: '演示列表' }
      };

      const result = await runFullWorkflow(page, blueprint);
      console.log('\n=== 编排结果 ===');
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('编排异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
