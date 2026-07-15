/**
 * Akso eGMP 创建编号规则原子模块
 *
 * URL: /admin/config/code-rules/base
 *
 * 表单结构：
 *   - 基础区：*名称(textbox), *Code(textbox), 状态(select), *对象(select), 描述(textbox)
 *   - 编号规则区（选完对象后出现）：工具栏 + 组件列表
 *     5 种组件类型：添加流水号 / 添加固定字符 / 添加日期 / 添加字段 / 添加相关对象字段
 *     每个组件通过 <LI class="ant-list-item"> 点击添加（需 { force: true }）
 *     每次添加新组件前需重新点击「添加规则」按钮展开类型列表
 *     预览面板实时显示编号格式
 *
 * 用法（模块调用）：
 *   const { createCodeRule } = require('./code-rule.js');
 *   const result = await createCodeRule(page, {
 *     name: '晚餐编号规则',
 *     code: 'code_dinner_no',
 *     objectName: '晚餐计划',
 *     rules: [
 *       { type: '固定字符', value: 'RC' },
 *       { type: '流水号', digit: '3', start: '1', step: '1' },
 *       { type: '日期', format: 'YYYYMM' }
 *     ]
 *   });
 *
 * 用法（独立运行）：
 *   node code-rule.js --name 编号规则名 --code code_xxx --objectName 对象名 --rules '[{"type":"固定字符","value":"RC"},{"type":"流水号","digit":"3","start":"1","step":"1"}]'
 *
 * 返回：{ success: boolean, message: string }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');

/**
 * 通过 label 文字定位 form-item 中的 input 并填值
 */
async function fillByLabel(page, labelText, value) {
  const items = await page.locator('.ant-form-item').all();
  for (const item of items) {
    const label = await item.locator('label').textContent().catch(() => '');
    if (label.includes(labelText)) {
      const input = item.locator('input');
      if (await input.count() > 0) {
        await input.first().click();
        await page.keyboard.insertText(String(value));
        return true;
      }
    }
  }
  return false;
}

/**
 * 点击组件类型 LI（需 force: true 因为可能不可见）
 */
async function addRuleComponent(page, typeText) {
  await page.getByRole('button', { name: '添加规则' }).click();
  await page.waitForTimeout(800);
  await page.locator('li').filter({ hasText: typeText }).first().click({ force: true });
  await page.waitForTimeout(1000);
}

/**
 * 配置单个规则组件
 */
async function configureComponent(page, rule) {
  switch (rule.type) {
    case '固定字符':
      await fillByLabel(page, '固定字符', rule.value);
      break;
    case '流水号':
      if (rule.digit) await fillByLabel(page, '*位数', rule.digit);
      if (rule.start) await fillByLabel(page, '*起始值', rule.start);
      if (rule.step) await fillByLabel(page, '*步长', rule.step);
      break;
    case '日期':
      if (rule.format) await fillByLabel(page, '日期格式', rule.format);
      break;
    case '字段':
      if (rule.field) await fillByLabel(page, '字段', rule.field);
      break;
    case '相关对象字段':
      if (rule.field) await fillByLabel(page, '相关对象字段', rule.field);
      break;
  }
  await page.waitForTimeout(500);
}

async function createCodeRule(page, opts = {}) {
  const name = opts.name;
  const code = opts.code;
  const objectName = opts.objectName;
  const desc = opts.desc || '';
  const rules = opts.rules || [];

  if (!name || !code || !objectName) {
    return { success: false, message: 'Missing name/code/objectName' };
  }

  try {
    const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

    await page.goto(`${baseUrl}/admin/config/code-rules/base`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Fill basic form
    await page.getByPlaceholder('请输入名称').fill(name);
    await page.getByRole('textbox', { name: '请输入Code' }).fill(code);
    await page.waitForTimeout(300);

    // Select object
    await page.locator('.ant-select-selector').nth(1).click();
    await page.waitForTimeout(600);
    await page.keyboard.insertText(objectName);
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Fill description if provided
    if (desc) {
      await page.getByPlaceholder('请输入描述').fill(desc);
      await page.waitForTimeout(300);
    }

    // Add and configure each rule component
    for (const rule of rules) {
      await addRuleComponent(page, `添加${rule.type}`);
      await configureComponent(page, rule);
    }

    // Save
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.getByRole('button', { name: '保存' }).click();
    await page.waitForTimeout(5000);

    // Dismiss popups
    for (const btnName of ['知道了', '并不保存', '确 定']) {
      try {
        const btn = page.getByRole('button', { name: btnName });
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) { await btn.click(); }
      } catch {}
    }

    const url = page.url();
    const success = url.includes('/code-rules/list') || url.includes('/web');

    return { success, message: `编号规则[${name}]创建${success ? '成功' : '可能失败'}，URL=${url}` };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (n) => { const i = args.indexOf(n); return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined; };

  const name = getArg('--name');
  const code = getArg('--code');
  const objectName = getArg('--objectName');
  const desc = getArg('--desc') || '';
  const rulesStr = getArg('--rules');

  if (!name || !code || !objectName) {
    console.error('用法: node code-rule.js --name 名称 --code code --objectName 对象名 [--rules JSON]');
    process.exit(1);
  }

  let rules = [];
  if (rulesStr) {
    try { rules = JSON.parse(rulesStr); } catch { console.error('rules 格式错误，应为 JSON 数组'); process.exit(1); }
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await createCodeRule(page, { name, code, objectName, desc, rules });
  console.log(result.message);
  await closeBrowser(browser);
}

module.exports = { createCodeRule, fillByLabel, addRuleComponent, main };

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
