/**
 * Akso eGMP 创建选项集原子模块 — v2.0
 * 
 * 用法（模块调用）：
 *   const { createOptionSet } = require('./create-option-set.js');
 *   const result = await createOptionSet(page, { name, code, options });
 * 
 * options 格式："显示值1,存储值1;显示值2,存储值2"
 * 
 * 用法（独立运行）：
 *   node create-option-set.js --name 选项集名 --code opt_code --options "早餐,breakfast;午餐,lunch"
 * 
 * 返回：{ success: boolean, message: string }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../shared/browser-manager');

async function createOptionSet(page, opts = {}) {
  const name = opts.name;
  const code = opts.code;
  const optionsRaw = opts.options;

  if (!name || !code || !optionsRaw) {
    return { success: false, message: 'Missing name/code/options' };
  }

  try {
    const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';
    await page.goto(baseUrl + '/admin/config/pick-list/list', { timeout: 15000 });
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: '创 建' }).click();
    await page.waitForTimeout(1500);

    await page.getByPlaceholder('请输入名称').fill(name);
    await page.getByRole('textbox', { name: '请输入Code' }).fill(code);
    await page.waitForTimeout(500);

    const batchText = optionsRaw.split(';').map(o => o.replace(',', ',')).join('\n');
    await page.getByRole('button', { name: '批量添加' }).click();
    await page.waitForTimeout(1000);
    await page.locator('textarea').fill(batchText);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '确 定' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'save 保存' }).click();
    await page.waitForTimeout(3000);

    const saved = page.url().includes('/pick-list/list');
    return { success: saved, message: saved ? `选项集[${name}]创建成功` : '保存后未跳回列表' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const name = getArg('--name');
  const code = getArg('--code');
  const options = getArg('--options');

  if (!name || !code || !options) {
    console.error('用法: node create-option-set.js --name 选项集名 --code opt_code --options "早餐,breakfast;午餐,lunch"');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await createOptionSet(page, { name, code, options });
  console.log(result.message);
  await closeBrowser(browser);
}

module.exports = { createOptionSet, main };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
