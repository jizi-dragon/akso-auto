/**
 * 字段类型选择 — 合并版（打开面板 + 点击目标类型）
 * 
 * 用法：复制到 browser_run_code_unsafe，替换 TYPE_TITLE 为目标类型名
 * 注意：browser_run_code_unsafe 的箭头函数内不能使用 await
 */

// ========== 普通类型（文本/长文本/数字/布尔/日期/附件/选项/查找） ==========
// 替换 TYPE_TITLE 为目标类型的 title
page.locator('.ant-select').first().locator('.ant-select-selector').click();
page.getByTitle('TYPE_TITLE').first().click();

// ========== 重叠标题类型（对象/父对象/对象多选） — 推荐方案（已验证） ==========
// 原因：getByTitle('对象', { exact: true }) 仍匹配 2 个元素（display span + dropdown div）
// 方案：nth(1) 选第二个 = 下拉面板中的 div，force 绕过 visibility 问题
page.locator('.ant-select').first().locator('.ant-select-selector').click();
page.locator('[title="对象"]').nth(1).click({ force: true });

// ========== 重叠标题类型 — 备选方案（正则匹配下拉面板，可能因不可见超时） ==========
page.locator('.ant-select').first().locator('.ant-select-selector').click();
page.locator('.ant-select-item-option-content')
  .filter({ hasText: /^父对象$/ })
  .click({ force: true });

// ========== 各类型的快速复制模板 ==========

// 文本
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.getByTitle('文本').first().click();

// 长文本
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.getByTitle('长文本').first().click();

// 数字
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.getByTitle('数字').nth(1).click(); // nth(1) 因为面板中被选中的当前值占 nth(0)

// 布尔
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.getByTitle('布尔').first().click();

// 选项
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.getByTitle('选项').first().click();

// 日期
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.getByTitle('日期').first().click();

// 附件
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.getByTitle('附件').first().click();

// 对象 — ⚠️ nth(1)+force（exact:true 仍匹配 2 元素）
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.locator('[title="对象"]').nth(1).click({ force: true });

// 父对象 — ⚠️ nth(1)+force，备选正则
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.locator('[title="父对象"]').nth(1).click({ force: true });

// 对象多选 — ⚠️ nth(1)+force（exact:true 仍匹配 2 元素）
// page.locator('.ant-select').first().locator('.ant-select-selector').click(); page.locator('[title="对象多选"]').nth(1).click({ force: true });
