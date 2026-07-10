/**
 * akso-basic-config-api — API 调用助手函数
 * Phase 2 — v0.2.2，24 个封装函数 + 可视模式 + 认证修复
 * 
 * 使用方式：在 browser_run_code_unsafe 中通过 page.evaluate 注入
 * 前提：页面已登录（__auth_token__ cookie 存在）
 */

// ============================================================================
// 0. 认证 & 可视模式
// ============================================================================

/** 从 cookie 提取 __auth_token__ */
function getAuthToken() {
  const m = document.cookie.match(new RegExp('(^| )__auth_token__=([^;]+)'));
  return m ? m[2] : null;
}

/** 开启 15 秒自动刷新 */
function enableVisibility(intervalMs = 15000) {
  if (window.__aksoRefreshId) clearInterval(window.__aksoRefreshId);
  window.__aksoRefreshId = setInterval(() => {
    console.log('[可视模式] 刷新页面...');
    location.reload();
  }, intervalMs);
  console.log(`[可视模式] 已开启，每 ${intervalMs/1000}s 刷新`);
}

/** 关闭自动刷新 */
function disableVisibility() {
  if (window.__aksoRefreshId) {
    clearInterval(window.__aksoRefreshId);
    window.__aksoRefreshId = null;
    console.log('[可视模式] 已关闭');
  }
}

/** 检查可视模式状态 */
function isVisibilityOn() {
  return !!window.__aksoRefreshId;
}

// ============================================================================
// 1. 底层调用（v0.2.2：修复认证，Cookie → Bearer Token）
// ============================================================================

const BASE = 'https://standard-val.aksoegmp.com';

async function apiPost(apiPath, body) {
  const token = getAuthToken();
  const resp = await fetch(BASE + apiPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(body)
  });
  return resp.json();
}

function isSuccess(resp) { return resp && resp.code === 0; }
function log(step, result) {
  console.log(`${result.success ? '✅' : '❌'} [${step}] ${result.message}`);
  if (!result.success) console.log('  ', JSON.stringify(result.result));
}

// ============================================================================
// 2. 对象
// ============================================================================

async function createObject({ name, code, enableLifeCycle = true }) {
  const resp = await apiPost('/api/platform/BasicObject/SaveBasicObject', {
    name, code, source: 3, status: 1, objectClass: 1,
    enableLifeCycle, enableSignatures: false, summaryFields: []
  });
  return { success: isSuccess(resp), message: resp.message || (isSuccess(resp) ? '对象创建成功' : '失败'), result: resp };
}

// ============================================================================
// 3. 字段（完整 14 种类型）
// ============================================================================

async function createField({ objectId, name, code, dataType, extras = {} }) {
  const body = {
    name, code, dataType, objectId,
    invisible: false, disabled: false,
    isRequired: extras.isRequired ?? false,
    statisticsArrange: { id: 1 },
    ...extras
  };
  // 清理 extras 中已处理的 key
  delete body.extras;
  const resp = await apiPost('/api/platform/BasicObject/SaveField', body);
  return { success: isSuccess(resp), message: isSuccess(resp) ? `字段[${name}]创建成功` : resp.message, result: resp };
}

// 快捷函数
async function createTextField(params)    { return createField({ ...params, dataType: 1 }); }
async function createNumberField(params)  { return createField({ ...params, dataType: 2 }); }
async function createBoolField(params)    { return createField({ ...params, dataType: 3 }); }
async function createOptionField(params)  { return createField({ ...params, dataType: 4 }); }
async function createDateField(params)    { return createField({ ...params, dataType: 5 }); }
async function createDatetimeField(params){ return createField({ ...params, dataType: 7 }); }
async function createAttachmentField(p)   { return createField({ ...p, dataType: 8 }); }
async function createLookupField(params)  { return createField({ ...params, dataType: 13 }); }
async function createFormulaField(params) { return createField({ ...params, dataType: 14 }); }
async function createObjectField(params)  { return createField({ ...params, dataType: 15 }); }
async function createParentField(params)  { return createField({ ...params, dataType: 16 }); }
async function createLongTextField(params){ return createField({ ...params, dataType: 17 }); }
async function createRichTextField(params){ return createField({ ...params, dataType: 18 }); }
async function createMultiObjectField(p)  { return createField({ ...p, dataType: 23 }); }

// 字段查询
async function queryFields(objectId, pageSize = 50) {
  const resp = await apiPost('/api/platform/BasicObject/FieldPage', {
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
// 4. 选项集（Phase 2 新增）
// ============================================================================

async function createPicklist({ name, code, options }) {
  const body = { name, code, options };
  const resp = await apiPost('/api/platform/ObjectPicklist/save', body);
  // 创建后需查询获取 ID
  return { success: isSuccess(resp), message: isSuccess(resp) ? `选项集[${name}]创建成功` : resp.message, result: resp };
}

// ============================================================================
// 5. 表单布局（Phase 2 新增）
// ============================================================================

/**
 * 保存表单布局
 * @param {object} params
 * @param {string} params.objectId      - 对象ID
 * @param {string} params.objectTypeId  - 对象类型ID
 * @param {string} params.name          - 布局名称
 * @param {string} params.code          - 布局Code
 * @param {array}  params.sections      - 分区列表 [{id,name,code,type,columnsNum}]
 * @param {array}  params.controls      - 控件列表 [{sectionId,code,name,fieldId,type,gridSpan,attrs}]
 * @param {string} params.layoutId      - 可选：更新已有布局时传入
 */
async function saveFormLayout({ objectId, objectTypeId, name, code, sections, controls, layoutId }) {
  const body = {
    id: layoutId || null,
    objectId, objectTypeId, name, code,
    source: 2, status: 1, isMain: true, labelCol: 0,
    sections: sections || [],
    controls: controls || [],
    pages: [], rules: [],
    activePageCode: null, activeSectionCode: null
  };
  const resp = await apiPost('/api/platform/Layout/SaveLayoutDetail', body);
  return { success: isSuccess(resp), message: isSuccess(resp) ? `布局[${name}]保存成功` : resp.message, result: resp };
}

// ============================================================================
// 6. 列表布局（Phase 2 新增）
// ============================================================================

async function saveListLayout({ name, code, objectId, objectTypeId }) {
  const resp = await apiPost('/api/platform/Listlayout/Save', {
    status: 1, source: 3, sortFields: [], name, code, objectTypeId, objectId
  });
  return {
    success: isSuccess(resp),
    layoutId: resp.data,
    message: isSuccess(resp) ? `列表[${name}]创建成功` : resp.message,
    result: resp
  };
}

async function addListColumns(listlayoutId, columns) {
  // columns: [{ fieldId, fieldPath, sort }]
  const resp = await apiPost('/api/platform/Listlayout/AddColumns', {
    listlayoutId, listlayoutColumns: columns
  });
  return { success: isSuccess(resp), message: isSuccess(resp) ? '列添加成功' : resp.message, result: resp };
}

// ============================================================================
// 7. 生命周期（Phase 1）
// ============================================================================

async function createLifecycleStatus({ lifecycleId, name, code, isEnabled = true }) {
  const resp = await apiPost('/api/config/lifecycle/Status/Create', {
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
// 8. 认证
// ============================================================================

async function refreshToken() {
  const resp = await apiPost('/api/auth/Oauth/RefreshToken', {
    fp: '0faf60287d99b5c86a8a7d4b239ffb02'
  });
  return { success: isSuccess(resp), token: resp.data, result: resp };
}

// ============================================================================
// 9. 导出
// ============================================================================
window.__aksoAPI = {
  // 认证 & 可视
  getAuthToken, enableVisibility, disableVisibility, isVisibilityOn,
  // 基础
  apiPost, isSuccess, log,
  // 对象
  createObject,
  // 字段
  createField, createTextField, createNumberField, createBoolField,
  createOptionField, createDateField, createDatetimeField,
  createAttachmentField, createLookupField, createFormulaField,
  createObjectField, createParentField,
  createLongTextField, createRichTextField, createMultiObjectField,
  queryFields,
  // 选项集
  createPicklist,
  // 布局
  saveFormLayout, saveListLayout, addListColumns,
  // 生命周期
  createLifecycleStatus,
  // 认证
  refreshToken
};
