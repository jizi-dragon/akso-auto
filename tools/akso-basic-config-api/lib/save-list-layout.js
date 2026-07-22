/**
 * akso-basic-config-api — 列表布局模块
 *
 * 功能：
 *   - 查询对象的列表布局列表（含默认布局）
 *   - 查询列表布局的显示字段列
 *   - 创建新的列表布局
 *   - 设置列表布局的显示字段（全量替换，非追加）
 *   - 查询和设置数据过滤条件（⚠️ 待完善，logicType 枚举未完整）
 *
 * ## 关键概念
 *
 * ### 默认列表布局
 * 每个对象创建时系统自动生成一个默认列表布局，source=2（标准），
 * code 格式为 `{对象code}_table__ak`。默认布局的显示字段可直接通过 setListColumns 修改。
 *
 * ### AddColumns 是全量替换
 * `POST /api/platform/Listlayout/AddColumns` 接收完整的列集合，
 * 不在集合中的列会被移除。这不是"追加"而是"设置"。
 * （注：前端 UI 层面可能有自动补字段的"智能"行为，但 API 层面是纯替换。）
 *
 * ### 跨对象字段（点号路径）
 * 通过查找字段关联到另一对象后，可引用关联对象上的字段：
 * ```
 * fieldPath: "obj_field__c.applicant__c"
 *              ↑ 查找字段code    ↑ 关联对象上的字段code
 * ```
 * fieldId 始终是目标字段自身的 UUID（不论该字段属于哪个对象）。
 * 可选字段通过 `GET /api/platform/BasicObject/FieldsAndOutField` 获取。
 *
 * @example <caption>设置数据过滤条件</caption>
 * const { saveListFilter } = require('./save-list-layout');
 *
 * // details[] 为条件数组，relations[] 定义条件的 AND/OR 逻辑树
 * await saveListFilter(page, {
 *   belongId: '布局UUID',
 *   details: [
 *     { id: uuid(), relationId: 'r1', targetType: 1, targetId: '字段UUID',
 *       targetCode: 'created_time__sys', logicType: 4, logicValue: '"2026-07-01"',
 *       targetFieldDataType: 7, index: Date.now() },
 *     { id: uuid(), relationId: 'r1', targetType: 1, targetId: '字段UUID',
 *       targetCode: 'created_by__sys', logicType: 1, logicValue: '{!current.user}',
 *       targetFieldDataType: 15, index: Date.now() }
 *   ],
 *   relations: [
 *     { id: 'r1', logicalOperator: 1, index: Date.now() }  // 1=AND, 2=OR
 *   ]
 * });
 *
 * @example <caption>修改默认列表布局的显示字段</caption>
 * const { chromium } = require('playwright');
 * const { login, closeBrowser } = require('../../shared/browser-manager');
 * const { getListLayouts, setListColumns } = require('./save-list-layout');
 *
 * const browser = await chromium.launch({ headless: false });
 * const page = await (await browser.newContext()).newPage();
 * await login(page);
 *
 * // 获取对象的列表布局
 * const layouts = await getListLayouts(page, '对象UUID');
 * const defaultLayout = layouts.find(l => l.source === 2); // source=2 为默认
 *
 * // 设置显示字段（全量替换）
 * await setListColumns(page, defaultLayout.id, [
 *   { fieldId: '...', fieldPath: 'is_deleted__sys', sort: 1 },
 *   { fieldId: '...', fieldPath: 'status_id__sys', sort: 2 },
 *   { fieldId: '...', fieldPath: 'name__ak', sort: 3 }
 * ]);
 *
 * await closeBrowser(browser);
 *
 * @example <caption>创建新列表布局 + 设置字段</caption>
 * const { saveListLayout, setListColumns } = require('./save-list-layout');
 *
 * const r = await saveListLayout(page, {
 *   name: '变更列表', code: 'list_change_list', objectId: '...', objectTypeId: '...'
 * });
 * if (r.success) {
 *   await setListColumns(page, r.layoutId, [
 *     { fieldId: '...', fieldPath: 'no__c', sort: 1 },
 *     { fieldId: '...', fieldPath: 'title__c', sort: 2 }
 *   ]);
 * }
 */

const { apiPost, apiGet, isSuccess } = require('./core');

/**
 * 获取对象的所有列表布局
 * @param {import('playwright').Page} page
 * @param {string} objectId - 对象 UUID
 * @returns {Promise<{success: boolean, layouts: Array, message: string}>}
 */
async function getListLayouts(page, objectId) {
  const resp = await apiGet(page, `/api/platform/Listlayout/List?objectId=${objectId}`);
  return {
    success: isSuccess(resp),
    layouts: resp.data || [],
    message: isSuccess(resp) ? `获取到 ${(resp.data || []).length} 个列表布局` : resp.message
  };
}

/**
 * 查询列表布局的当前显示字段列
 * @param {import('playwright').Page} page
 * @param {string} listlayoutId - 列表布局 UUID
 * @returns {Promise<{success: boolean, columns: Array, message: string}>}
 */
async function getListColumns(page, listlayoutId) {
  const resp = await apiGet(page, `/api/platform/Listlayout/Columns?listlayoutId=${listlayoutId}`);
  return {
    success: isSuccess(resp),
    columns: resp.data || [],
    message: isSuccess(resp) ? `获取到 ${(resp.data || []).length} 个字段列` : resp.message
  };
}

/**
 * 创建新的列表布局（不包括设置显示字段）
 * @param {import('playwright').Page} page
 * @param {{ name: string, code: string, objectId: string, objectTypeId: string }} params
 * @returns {Promise<{success: boolean, layoutId: string|null, message: string}>}
 */
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

/**
 * 设置列表布局的显示字段（全量替换）
 *
 * 发送完整的列集合，不在集合中的列会被移除。
 * @param {import('playwright').Page} page
 * @param {string} listlayoutId - 列表布局 UUID
 * @param {Array<{fieldId: string, fieldPath: string, sort: number}>} columns
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function setListColumns(page, listlayoutId, columns) {
  const resp = await apiPost(page, '/api/platform/Listlayout/AddColumns', {
    listlayoutId, listlayoutColumns: columns
  });
  return {
    success: isSuccess(resp),
    message: isSuccess(resp) ? `列设置成功（${columns.length} 个字段）` : resp.message,
    result: resp
  };
}

/**
 * @deprecated 请使用 setListColumns。此函数名有误导性（实际是全量替换，非追加）。
 * 保留此别名以兼容旧代码。
 */
const addListColumns = setListColumns;

// ========== 数据过滤（⚠️ 待完善） ==========

/**
 * logicType 枚举 — 数据过滤条件操作类型
 * ⚠️ 当前仅确认 4 种，尚未完整枚举
 */
const LOGIC_TYPE = {
  EQUAL: 1,       // 等于
  AFTER: 4,       // 晚于（日期/日期时间）
  IS_EMPTY: 10,   // 为空
  NOT_EMPTY: 11   // 不为空
};

/** logicalOperator — 条件组合逻辑 */
const LOGICAL_OP = {
  AND: 1,
  OR: 2
};

/**
 * 查询列表布局的数据过滤配置
 * @param {import('playwright').Page} page
 * @param {string} belongId - 列表布局 UUID
 * @returns {Promise<{success: boolean, data: object|null, message: string}>}
 */
async function getListFilters(page, belongId) {
  const resp = await apiGet(page, `/api/platform/Listlayout/Filters?belongId=${belongId}`);
  return {
    success: isSuccess(resp),
    data: resp.data || null,
    message: isSuccess(resp) ? '获取过滤配置成功' : resp.message
  };
}

/**
 * 保存列表布局的数据过滤条件（全量替换，upsert 模式）
 *
 * 首次调用不传 id（创建），二次调用传首次返回的 id（更新）。
 *
 * @param {import('playwright').Page} page
 * @param {object} config
 * @param {string} config.belongId - 列表布局 UUID
 * @param {Array} config.details - 条件数组
 * @param {Array} config.relations - 条件逻辑关系树
 * @param {string} [config.id] - 过滤配置 UUID（更新时传入首次保存返回的 id）
 * @returns {Promise<{success: boolean, filterId: string|null, message: string}>}
 */
async function saveListFilter(page, { belongId, details, relations, id }) {
  const body = { belongId, details, relations };
  if (id) body.id = id;
  const resp = await apiPost(page, '/api/platform/Listlayout/SaveFilter', body);
  return {
    success: isSuccess(resp),
    filterId: resp.data || null,
    message: isSuccess(resp) ? '过滤条件保存成功' : resp.message,
    result: resp
  };
}

module.exports = {
  getListLayouts,
  getListColumns,
  saveListLayout,
  setListColumns,
  addListColumns, // @deprecated
  getListFilters,
  saveListFilter,
  LOGIC_TYPE,
  LOGICAL_OP
};

if (require.main === module) {
  (async () => {
    const { chromium } = require('playwright');
    const { login, closeBrowser } = require('../../shared/browser-manager');
    const browser = await chromium.launch({ headless: false });
    const page = await (await browser.newContext()).newPage();
    try {
      await login(page);
      console.log('列表布局模块就绪');
      console.log('  导出: getListLayouts, getListColumns, saveListLayout, setListColumns');
      console.log('  过滤: getListFilters, saveListFilter (⚠️ 待完善)');
      console.log('  常量: LOGIC_TYPE, LOGICAL_OP');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
