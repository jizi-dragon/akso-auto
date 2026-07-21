/**
 * akso-basic-config-api — 创建字段（含 14 种类型快捷函数 + 字段查询）
 *
 * dataType 枚举：1=文本 2=数字 3=布尔 4=选项 5=日期 7=日期时间
 *               8=附件 13=查找 14=公式 15=对象 16=父对象 17=长文本 18=富文本 23=对象多选
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
 * const { createTextField, createOptionField, queryFields } = require('./create-field');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * await createTextField(page, { objectId: '...', name: '编号', code: 'no__c', isRequired: true });
 * await createOptionField(page, { objectId: '...', name: '类型', code: 'type__c', picklistId: '...' });
 * const fields = await queryFields(page, '对象ID');
 * console.log('字段数:', fields.total);
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node scripts/create-field.js
 */

const { apiPost, isSuccess } = require('./core');

async function createField(page, { objectId, name, code, dataType, extras = {} }) {
  const body = {
    name, code, dataType, objectId,
    invisible: false, disabled: false,
    isRequired: extras.isRequired ?? false,
    statisticsArrange: { id: 1 },
    ...extras
  };
  delete body.extras;
  const resp = await apiPost(page, '/api/platform/BasicObject/SaveField', body);
  return {
    success: isSuccess(resp),
    message: isSuccess(resp) ? `字段[${name}]创建成功` : resp.message,
    result: resp
  };
}

async function createTextField(page, params)     { return createField(page, { ...params, dataType: 1 }); }
async function createNumberField(page, params)   { return createField(page, { ...params, dataType: 2 }); }
async function createBoolField(page, params)     { return createField(page, { ...params, dataType: 3 }); }
async function createOptionField(page, params)   { return createField(page, { ...params, dataType: 4 }); }
async function createDateField(page, params)     { return createField(page, { ...params, dataType: 5 }); }
async function createDatetimeField(page, params) { return createField(page, { ...params, dataType: 7 }); }
async function createAttachmentField(page, p)    { return createField(page, { ...p, dataType: 8 }); }
async function createLookupField(page, params)   { return createField(page, { ...params, dataType: 13 }); }
async function createFormulaField(page, params)  { return createField(page, { ...params, dataType: 14 }); }
async function createObjectField(page, params)   { return createField(page, { ...params, dataType: 15 }); }
async function createParentField(page, params)   { return createField(page, { ...params, dataType: 16 }); }
async function createLongTextField(page, params) { return createField(page, { ...params, dataType: 17 }); }
async function createRichTextField(page, params) { return createField(page, { ...params, dataType: 18 }); }
async function createMultiObjectField(page, p)   { return createField(page, { ...p, dataType: 23 }); }

async function queryFields(page, objectId, pageSize = 50) {
  const resp = await apiPost(page, '/api/platform/BasicObject/FieldPage', {
    objectId, pageIndex: 1, pageSize, filters: {}
  });
  return {
    success: isSuccess(resp),
    total: resp.data?.totalCount || 0,
    items: resp.data?.items || [],
    result: resp
  };
}

module.exports = {
  createField,
  createTextField, createNumberField, createBoolField,
  createOptionField, createDateField, createDatetimeField,
  createAttachmentField, createLookupField, createFormulaField,
  createObjectField, createParentField,
  createLongTextField, createRichTextField, createMultiObjectField,
  queryFields
};

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      const { createObject } = require('./create-object');
      const objResult = await createObject(page, { name: '字段测试对象', code: 'field_test_obj__c' });
      if (objResult.success) {
        const { getObjectInfo } = require('./openapi-queries');
        const info = await getObjectInfo(page, 'field_test_obj__c');
        if (info.objectId) {
          const result = await createTextField(page, {
            objectId: info.objectId, name: '测试文本', code: 'test_text__c', isRequired: true
          });
          console.log(JSON.stringify(result, null, 2));
        }
      }
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
