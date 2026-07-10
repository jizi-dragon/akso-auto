/**
 * 对象绑定 — 对象字段专用（不含父对象）
 * 
 * 用法：在字段创建表单中选择「对象」类型后，复制到 browser_run_code_unsafe
 * 替换 TARGET_OBJECT_NAME 为目标对象名称
 * 
 * ⚠️ 此脚本仅适用于「对象」和「对象多选」字段类型
 * ⚠️ 「父对象」字段请使用 parent-object-bind.js（布局不同，.ant-select:nth(2) 会误输入到 Code 框）
 */

// ========== 修改这里 ==========
const TARGET_OBJECT_NAME = '日常测试_new';
// =============================

// 点击 *对象 combobox
page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();

// 一次性输入关键词
page.keyboard.insertText(TARGET_OBJECT_NAME);

// 选中第一个匹配结果
page.keyboard.press('Enter');
