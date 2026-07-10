/**
 * 父对象绑定 — 父对象字段专用
 * 
 * ⚠️ 关键差异：父对象字段表单布局与普通对象字段不同
 *   - 普通对象：.ant-select:nth(2) = *对象 选择器 ✅
 *   - 父对象：.ant-select:nth(2) ≠ *对象 选择器 ❌（会误输入到 Code 框！）
 * 
 * 原因：父对象表单多了一个「对象类型」选择器，打乱了 .ant-select 顺序
 * 
 * 推荐策略：
 *   方案 A（推荐）：先 snapshot 获取 *对象 combobox 的 ref，用 ref 操作
 *   方案 B：用表单标签过滤定位（.ant-form-item:hasText('*对象')）
 * 
 * 紧急恢复：如果已误输入到 Code 框，脚本末尾附有恢复代码
 */

// ======== 方案 A：snapshot + ref（推荐，最可靠） ========
// 使用方式：
//   1. browser_run_code_unsafe: 创建字段 + 选父对象类型 + 填名称/Code
//   2. browser_snapshot: 获取 *对象 combobox 的 ref
//   3. browser_click ref: 点击 combobox
//   4. browser_run_code_unsafe: insertText + Enter 绑定对象
//   5. browser_click: 保存

// 步骤 1+2 中的字段类型选择代码：
// page.locator('.ant-select').first().locator('.ant-select-selector').click();
// page.locator('.ant-select-item-option-content').filter({ hasText: /^父对象$/ }).click();

// 步骤 4 的绑定代码（拿到 ref 后）：
// ========== 修改这里 ==========
const TARGET_OBJECT_NAME = '日常测试_new';
// =============================
// page.keyboard.insertText(TARGET_OBJECT_NAME);
// page.keyboard.press('Enter');


// ======== 方案 B：表单标签过滤定位（无需 snapshot） ========
// ⚠️ 此方案依赖 DOM 结构稳定，如失效请回退到方案 A
// page.locator('.ant-form-item')
//   .filter({ hasText: '*对象' })
//   .locator('.ant-select-selector')
//   .first()
//   .click();
// page.keyboard.insertText(TARGET_OBJECT_NAME);
// page.keyboard.press('Enter');


// ======== 🔧 紧急恢复：误输入到了 Code 框 ========
// 症状：Code 框出现了 "parent_obj_test日常测试_new" 这样的文本
//       页面显示 "只能是数字字母下划线" 错误

// 恢复步骤：
// 1. 修复 Code
// page.getByRole('textbox', { name: '请输入Code' }).fill('正确的code');
// 2. 回到方案 A 或 B，重新定位 *对象 combobox
// 3. 重新绑定对象
// 4. 保存
