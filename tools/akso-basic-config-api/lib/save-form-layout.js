/**
 * akso-basic-config-api — 表单布局模块
 *
 * 功能：
 *   - 查询对象的表单布局列表（含默认布局）
 *   - 查询表单布局详情（含已有 sections 和 controls）
 *   - 保存表单布局（sections + controls 全量提交）
 *
 * ## 关键概念
 *
 * ### 默认表单布局
 * 每个对象创建时系统自动生成一个默认表单布局，source=2（标准），
 * code 格式为 `{对象code}_base_layout__ak`，isMain=true。
 * 通常只需在默认布局上修改，无需新建。
 *
 * ### 部分（Section）vs 控件（Control）
 * - 部分（section）：容器/盒子，用于组织和展示控件，type=1 为标准分区
 * - 控件（control）：将字段展示到布局中的 UI 组件，通过 sectionId 归属到某个部分
 * - 系统默认自带"工作流时间线"部分（type=4），不可删除
 *
 * ### SaveLayoutDetail 是全量替换
 * `POST /api/platform/Layout/SaveLayoutDetail` 接收完整的 sections + controls 数组，
 * 不在数组中的部分和控件会被移除。这与列表布局的 AddColumns 行为一致。
 * 因此修改前应先用 getFormLayoutDetail 读取现有结构。
 *
 * @example <caption>在默认布局上添加部分和控件</caption>
 * const { getFormLayouts, getFormLayoutDetail, saveFormLayout } = require('./save-form-layout');
 *
 * // 1. 获取默认布局
 * const layouts = await getFormLayouts(page, '对象UUID');
 * const defaultLayout = layouts.find(l => l.source === 2);
 *
 * // 2. 读取现有结构
 * const detail = await getFormLayoutDetail(page, defaultLayout.id);
 *
 * // 3. 追加新部分和控件后保存
 * const sectionId = generateUUID();
 * await saveFormLayout(page, {
 *   id: defaultLayout.id,
 *   objectId: defaultLayout.objectId,
 *   objectTypeId: defaultLayout.objectTypeId,
 *   name: defaultLayout.name,
 *   code: defaultLayout.code,
 *   // 保留原有 sections + 新 section
 *   sections: [
 *     ...detail.sections,
 *     { id: sectionId, code: 'cs1__cs', name: '基本信息', type: 1, columnsNum: 2 }
 *   ],
 *   controls: [
 *     ...detail.controls,
 *     { id: generateUUID(), sectionId, code: 'no__c', name: '编号',
 *       fieldId: '字段UUID', type: CONTROL_TYPE.INPUT, gridSpan: 1, attrs: {} }
 *   ]
 * });
 */

const { apiPost, apiGet, isSuccess } = require('./core');

// ========== 组件类型常量 ==========

/**
 * 控件组件类型 — 不同字段类型在表单中对应的 UI 组件
 */
const CONTROL_TYPE = {
  INPUT: 'AKInput',                // 文本/数字等基础输入
  SELECTOR_SINGLE: 'AKSelectorSingle', // 选项（单选）
  SELECTOR_MULTI: 'AKSelectorMulti',   // 选项（多选）
  SELECTOR_OBJECT: 'AKSelectorObject', // 对象查找
  SELECTOR_YES_NO: 'AKSelectorYesNo',  // 是否
  DATE_TIME: 'AKDateTime',         // 日期/日期时间
  FILE: 'AKFile',                  // 附件/文件
  RICH_TEXT: 'AKRichTextEditor'    // 富文本
};

// ========== 查询 API ==========

/**
 * 获取对象的所有表单布局
 * @param {import('playwright').Page} page
 * @param {string} objectId - 对象 UUID
 * @returns {Promise<{success: boolean, layouts: Array, message: string}>}
 */
async function getFormLayouts(page, objectId) {
  const resp = await apiGet(page,
    `/api/platform/Layout/LayoutList?basicObjectId=${objectId}&pageIndex=1&pageSize=20`);
  return {
    success: isSuccess(resp),
    layouts: resp.data?.datas || [],
    message: isSuccess(resp) ? `获取到 ${(resp.data?.datas || []).length} 个表单布局` : resp.message
  };
}

/**
 * 获取表单布局详情（含 sections 和 controls）
 * @param {import('playwright').Page} page
 * @param {string} layoutId - 布局 UUID
 * @returns {Promise<{success: boolean, layout: object|null, message: string}>}
 */
async function getFormLayoutDetail(page, layoutId) {
  const resp = await apiGet(page,
    `/api/platform/Layout/LayoutDetail?layoutId=${layoutId}`);
  return {
    success: isSuccess(resp),
    layout: resp.data || null,
    message: isSuccess(resp) ? '获取布局详情成功' : resp.message
  };
}

// ========== 保存 API ==========

/**
 * 保存表单布局（全量替换 sections + controls）
 *
 * 将完整的 sections 和 controls 数组一次性提交。
 * 不在数组中的部分/控件会被移除，修改前应先用 getFormLayoutDetail 读取现有结构。
 *
 * @param {import('playwright').Page} page
 * @param {object} config
 * @param {string} config.id - 布局 UUID（修改已有布局时必传）
 * @param {string} config.objectId - 对象 UUID
 * @param {string} config.objectTypeId - 对象类型 UUID
 * @param {string} config.name - 布局名称
 * @param {string} config.code - 布局 code
 * @param {Array} [config.sections=[]] - 部分列表
 * @param {Array} [config.controls=[]] - 控件列表
 * @returns {Promise<{success: boolean, message: string, result: object}>}
 */
async function saveFormLayout(page, {
  id, objectId, objectTypeId, name, code, sections, controls
}) {
  const body = {
    id: id || null,
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

module.exports = {
  getFormLayouts,
  getFormLayoutDetail,
  saveFormLayout,
  CONTROL_TYPE
};

if (require.main === module) {
  (async () => {
    const { chromium } = require('playwright');
    const { login, closeBrowser } = require('../../shared/browser-manager');
    const browser = await chromium.launch({ headless: false });
    const page = await (await browser.newContext()).newPage();
    try {
      await login(page);
      console.log('表单布局模块就绪');
      console.log('  查询: getFormLayouts, getFormLayoutDetail');
      console.log('  保存: saveFormLayout');
      console.log('  常量: CONTROL_TYPE');
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
