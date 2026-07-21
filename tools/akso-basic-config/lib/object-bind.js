/**
 * 对象绑定 — 对象字段专用（不含父对象）
 * 
 * 用法：bindObject(page, '日常测试_new')
 * 
 * ⚠️ 此脚本仅适用于「对象」和「对象多选」字段类型
 * ⚠️ 「父对象」字段请使用 bindParentObject（布局不同，.ant-select:nth(2) 会误输入到 Code 框）
 * 
 * 策略：打开下拉 → 输入关键词 → 读取全部选项 → 精确匹配 → 点击
 *        排除含"电子签名"的混淆项
 */
const { selectFromCombobox } = require('./create-field.js');

async function bindObject(page, objectName) {
  await selectFromCombobox(
    page,
    page.locator('.ant-select').nth(2).locator('.ant-select-selector'),
    objectName,
    '电子签名'
  );
}

module.exports = { bindObject };
