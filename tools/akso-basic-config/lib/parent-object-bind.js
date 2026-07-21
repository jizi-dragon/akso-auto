/**
 * 父对象绑定 — 父对象字段专用
 *
 * 用法：bindParentObject(page, '日常测试_new')
 *
 * ⚠️ 关键差异：父对象字段表单布局与普通对象字段不同
 *   - 普通对象：.ant-select:nth(2) = *对象 选择器 ✅
 *   - 父对象：.ant-select:nth(2) ≠ *对象 选择器 ❌（会误输入到 Code 框！）
 *
 * 原因：父对象表单多了一个「对象类型」选择器，打乱了 .ant-select 顺序
 *
 * 本函数使用表单标签过滤定位（.ant-form-item:hasText('*对象')），无需 snapshot
 *
 * 策略：打开下拉 → 输入关键词 → 读取全部选项 → 精确匹配 → 点击
 *        排除含"电子签名"的混淆项
 *
 * 紧急恢复：如果已误输入到 Code 框，使用 recoverCodeField(page, correctCode)
 */
const { selectFromCombobox } = require('./create-field.js');

async function bindParentObject(page, objectName) {
  await selectFromCombobox(
    page,
    page.locator('.ant-form-item')
      .filter({ hasText: '*对象' })
      .locator('.ant-select-selector')
      .first(),
    objectName,
    '电子签名'
  );
}

/**
 * 紧急恢复：误输入到了 Code 框
 * 症状：Code 框出现了 "parent_obj_test日常测试_new" 这样的文本
 *       页面显示 "只能是数字字母下划线" 错误
 */
async function recoverCodeField(page, correctCode) {
  await page.getByRole('textbox', { name: '请输入Code' }).fill(correctCode);
}

module.exports = { bindParentObject, recoverCodeField };
