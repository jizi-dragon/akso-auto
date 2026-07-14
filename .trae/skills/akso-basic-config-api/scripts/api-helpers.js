/**
 * akso-basic-config-api — API 调用助手函数
 * Phase 2 — v0.3.0，34 个导出函数 + 可视模式 + Playwright 重构
 * 
 * 使用方式：Node.js 模块，基于 Playwright npm 包
 * 前提：已通过 shared/browser-manager 登录（__auth_token__ cookie 存在）
 */

const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');

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

// ============================================================================
// 0. 认证 & 可视模式
// ============================================================================

async function getAuthToken(page) {
  const cookies = await page.context().cookies();
  const token = cookies.find(c => c.name === '__auth_token__')?.value;
  return token;
}

let __aksoRefreshId = null;

function enableVisibility(page, intervalMs = 15000) {
  if (__aksoRefreshId) clearTimeout(__aksoRefreshId);
  const doRefresh = () => {
    console.log('[可视模式] 刷新页面...');
    page.reload().then(() => {
      __aksoRefreshId = setTimeout(doRefresh, intervalMs);
    }).catch(err => {
      console.error('[可视模式] 刷新失败:', err.message);
    });
  };
  __aksoRefreshId = setTimeout(doRefresh, intervalMs);
  console.log(`[可视模式] 已开启，每 ${intervalMs / 1000}s 刷新`);
}

function disableVisibility() {
  if (__aksoRefreshId) {
    clearTimeout(__aksoRefreshId);
    __aksoRefreshId = null;
    console.log('[可视模式] 已关闭');
  }
}

function isVisibilityOn() {
  return !!__aksoRefreshId;
}

// ============================================================================
// 1. 底层调用
// ============================================================================

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

function isSuccess(resp) { return resp && resp.code === 0; }

function log(step, result) {
  console.log(`${result.success ? '✅' : '❌'} [${step}] ${result.message}`);
  if (!result.success) console.log('  ', JSON.stringify(result.result));
}

// ============================================================================
// 2. 对象
// ============================================================================

async function createObject(page, { name, code, enableLifeCycle = true }) {
  const resp = await apiPost(page, '/api/platform/BasicObject/SaveBasicObject', {
    name, code, source: 3, status: 1, objectClass: 1,
    enableLifeCycle, enableSignatures: false, summaryFields: []
  });
  return { success: isSuccess(resp), message: resp.message || (isSuccess(resp) ? '对象创建成功' : '失败'), result: resp };
}

// ============================================================================
// 3. 字段（完整 14 种类型）
// ============================================================================

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
  return { success: isSuccess(resp), message: isSuccess(resp) ? `字段[${name}]创建成功` : resp.message, result: resp };
}

// 快捷函数
async function createTextField(page, params)    { return createField(page, { ...params, dataType: 1 }); }
async function createNumberField(page, params)  { return createField(page, { ...params, dataType: 2 }); }
async function createBoolField(page, params)    { return createField(page, { ...params, dataType: 3 }); }
async function createOptionField(page, params)  { return createField(page, { ...params, dataType: 4 }); }
async function createDateField(page, params)    { return createField(page, { ...params, dataType: 5 }); }
async function createDatetimeField(page, params){ return createField(page, { ...params, dataType: 7 }); }
async function createAttachmentField(page, p)   { return createField(page, { ...p, dataType: 8 }); }
async function createLookupField(page, params)  { return createField(page, { ...params, dataType: 13 }); }
async function createFormulaField(page, params) { return createField(page, { ...params, dataType: 14 }); }
async function createObjectField(page, params)  { return createField(page, { ...params, dataType: 15 }); }
async function createParentField(page, params)  { return createField(page, { ...params, dataType: 16 }); }
async function createLongTextField(page, params){ return createField(page, { ...params, dataType: 17 }); }
async function createRichTextField(page, params){ return createField(page, { ...params, dataType: 18 }); }
async function createMultiObjectField(page, p)  { return createField(page, { ...p, dataType: 23 }); }

// 字段查询
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

// ============================================================================
// 4. 选项集
// ============================================================================

async function createPicklist(page, { name, code, options }) {
  const body = { name, code, options };
  const resp = await apiPost(page, '/api/platform/ObjectPicklist/save', body);
  return { success: isSuccess(resp), message: isSuccess(resp) ? `选项集[${name}]创建成功` : resp.message, result: resp };
}

// ============================================================================
// 5. 表单布局
// ============================================================================

/**
 * 保存表单布局
 * @param {object} page           - Playwright page
 * @param {object} params
 * @param {string} params.objectId      - 对象ID
 * @param {string} params.objectTypeId  - 对象类型ID
 * @param {string} params.name          - 布局名称
 * @param {string} params.code          - 布局Code
 * @param {array}  params.sections      - 分区列表 [{id,name,code,type,columnsNum}]
 * @param {array}  params.controls      - 控件列表 [{sectionId,code,name,fieldId,type,gridSpan,attrs}]
 * @param {string} params.layoutId      - 可选：更新已有布局时传入
 */
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
  return { success: isSuccess(resp), message: isSuccess(resp) ? `布局[${name}]保存成功` : resp.message, result: resp };
}

// ============================================================================
// 6. 列表布局
// ============================================================================

async function saveListLayout(page, { name, code, objectId, objectTypeId }) {
  const resp = await apiPost(page, '/api/platform/Listlayout/Save', {
    status: 1, source: 3, sortFields: [], name, code, objectTypeId, objectId
  });
  return {
    success: isSuccess(resp),
    layoutId: resp.data,
    message: isSuccess(resp) ? `列表[${name}]创建成功` : resp.message,
    result: resp
  };
}

async function addListColumns(page, listlayoutId, columns) {
  const resp = await apiPost(page, '/api/platform/Listlayout/AddColumns', {
    listlayoutId, listlayoutColumns: columns
  });
  return { success: isSuccess(resp), message: isSuccess(resp) ? '列添加成功' : resp.message, result: resp };
}

// ============================================================================
// 7. 生命周期
// ============================================================================

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

// ============================================================================
// 8. OpenAPI 查询辅助层（基于标准API文档-V1.0）
// ============================================================================

/**
 * 备用认证：通过 OpenAPI 获取 JWT 令牌（60 分钟有效期）
 * ⚠️ 明文密码传输，仅用于内部自动化场景
 * 文档：标准API文档-V1.0 §4.1
 */
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

/**
 * 获取对象信息（含 objectId、lifecycleId）
 * 文档：标准API文档-V1.0 §4.8
 */
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

/**
 * 查询对象字段列表
 * 文档：标准API文档-V1.0 §4.6
 */
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

/**
 * 查询选项集选项值
 * 文档：标准API文档-V1.0 §4.7
 */
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

/**
 * 查询对象生命周期状态
 * 文档：标准API文档-V1.0 §4.5
 */
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

// ============================================================================
// 9. 导出
// ============================================================================

module.exports = {
  getAuthToken, enableVisibility, disableVisibility, isVisibilityOn,
  apiPost, isSuccess, log,
  createObject,
  createField, createTextField, createNumberField, createBoolField,
  createOptionField, createDateField, createDatetimeField,
  createAttachmentField, createLookupField, createFormulaField,
  createObjectField, createParentField,
  createLongTextField, createRichTextField, createMultiObjectField,
  queryFields,
  createPicklist,
  saveFormLayout, saveListLayout, addListColumns,
  createLifecycleStatus,
  getOpenApiToken, getObjectInfo, getFieldList, getPicklistOptions, getLifecycleStatus,
  ERROR_CODES
};

// ============================================================================
// 10. 独立运行入口
// ============================================================================

if (require.main === module) {
  (async () => {
    console.log('=== akso-basic-config-api Playwright 演示 ===\n');

    const { browser, context, page } = await launchBrowser({ headless: false });
    try {
      const loginResult = await login(page);
      if (!loginResult.success) {
        console.error('❌ 登录失败:', loginResult.url);
        return;
      }
      console.log('✅ 登录成功:', loginResult.url);

      const token = await getAuthToken(page);
      console.log(`🔑 Token: ${token ? token.substring(0, 20) + '...' : '(无)'}`);

      const testResult = await createObject(page, {
        name: '测试对象_Playwright演示',
        code: 'test_obj_playwright_demo'
      });
      log('创建对象', testResult);

      if (testResult.success && testResult.result.data) {
        const objectId = testResult.result.data;
        const fieldResult = await createTextField(page, {
          objectId,
          name: '测试文本字段',
          code: 'test_text_field'
        });
        log('创建字段', fieldResult);
      }
    } catch (err) {
      console.error('❌ 执行异常:', err.message);
    } finally {
      await closeBrowser(browser);
      console.log('\n=== 演示结束 ===');
    }
  })();
}
