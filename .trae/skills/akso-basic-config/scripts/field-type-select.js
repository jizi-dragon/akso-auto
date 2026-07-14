/**
 * 字段类型选择 — 合并版（打开面板 + 点击目标类型）
 * 
 * 用法：selectFieldType(page, '文本')
 * 
 * 特殊处理：
 *   - 对象/父对象/对象多选：标题重叠（display span + dropdown div），用 nth(1)+force
 *   - 数字：面板中被选中的当前值占 nth(0)，需 nth(1)
 *   - 其他普通类型：getByTitle.first()
 */

const OVERLAPPING_TYPES = ['对象', '父对象', '对象多选'];

async function selectFieldType(page, typeName) {
  await page.locator('.ant-select').first().locator('.ant-select-selector').click();

  if (OVERLAPPING_TYPES.includes(typeName)) {
    // 重叠标题类型：getByTitle exact:true 仍匹配 2 个元素（display span + dropdown div）
    // nth(1) 选第二个 = 下拉面板中的 div，force 绕过 visibility 问题
    await page.locator(`[title="${typeName}"]`).nth(1).click({ force: true });
    return;
  }

  // 数字类型：面板中被选中的当前值占 nth(0)，需 nth(1)
  if (typeName === '数字') {
    await page.getByTitle(typeName).nth(1).click();
    return;
  }

  // 普通类型（文本/长文本/布尔/日期/附件/选项/查找）
  await page.getByTitle(typeName).first().click();
}

module.exports = { selectFieldType };
