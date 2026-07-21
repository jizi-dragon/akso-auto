/**
 * 选项集绑定 — 选项字段专用
 * 
 * 用法：bindOptionSet(page, '测试选项_617')
 * 
 * 原理：.ant-select:nth(2) = 字段类型(0) → 状态(1) → *选项(2)
 * 
 * 策略：打开下拉 → 输入关键词 → 读取全部选项 → 精确匹配 → 点击
 * 
 * ⚠️ 禁止：此步不要调 snapshot，1000+ 条目会超 token
 */
const { selectFromCombobox } = require('./create-field.js');

async function bindOptionSet(page, optionSetName) {
  await selectFromCombobox(
    page,
    page.locator('.ant-select').nth(2).locator('.ant-select-selector'),
    optionSetName
  );
}

module.exports = { bindOptionSet };
