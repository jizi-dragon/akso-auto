/**
 * 选项集绑定 — 选项字段专用
 * 
 * 用法：在字段创建表单中选择「选项」类型后，复制到 browser_run_code_unsafe
 * 替换 OPTION_SET_NAME 为目标选项集名称
 * 
 * 原理：.ant-select:nth(2) = 字段类型(0) → 状态(1) → *选项(2)
 *       keyboard.insertText 一次性粘贴避免逐字触发 Ant Select 全量过滤
 * 
 * ⚠️ 禁止：此步不要调 snapshot，1000+ 条目会超 token
 */

// ========== 修改这里 ==========
const OPTION_SET_NAME = '测试选项_617';
// =============================

// 点击 *选项 combobox
page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();

// 一次性输入关键词
page.keyboard.insertText(OPTION_SET_NAME);

// 选中第一个匹配结果
page.keyboard.press('Enter');
