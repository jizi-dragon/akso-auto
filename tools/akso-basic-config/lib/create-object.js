/**
 * Akso eGMP 创建对象原子模块 — v2.0
 * 
 * 用法（模块调用）：
 *   const { createObject } = require('./create-object.js');
 *   const result = await createObject(page, { name, code, enableLifecycle });
 * 
 * 用法（独立运行）：
 *   node create-object.js --name 对象名 --code obj_code --enableLifecycle
 * 
 * 返回：{ success: boolean, objectId?: string, message: string }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../shared/browser-manager');

async function createObject(page, opts = {}) {
  const name = opts.name;
  const code = opts.code;
  const enableLifecycle = opts.enableLifecycle === true || opts.enableLifecycle === 'true';

  if (!name || !code) {
    return { success: false, message: 'Missing name/code' };
  }

  try {
    const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';
    await page.goto(baseUrl + '/admin/config/basic-objects/list', { timeout: 15000 });
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: '创 建' }).click();
    await page.waitForTimeout(2000);

    await page.getByPlaceholder('请输入对象名称').fill(name);
    await page.getByRole('textbox', { name: '请输入Code' }).fill(code);
    await page.waitForTimeout(300);

    if (enableLifecycle) {
      await page.getByRole('checkbox', { name: '生命周期', exact: true }).click();
      await page.waitForTimeout(300);
    }

    await page.getByRole('button', { name: 'save 保存' }).click();
    const waitTime = enableLifecycle ? 15000 : 5000;
    await page.waitForTimeout(waitTime);

    const dupBtn = page.getByRole('button', { name: '知道了' });
    if (await dupBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dupBtn.click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: '返回' }).click({ timeout: 3000 });
      return { success: false, message: `对象[${name}]名称重复，请更换名称后重试` };
    }

    const url = page.url();
    let objectId = null;
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch) objectId = idMatch[1];

    if (!objectId && url.includes('/basic-objects/list')) {
      await page.locator('input[placeholder*="查询"]').fill(name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      const linkHref = await page.locator('table tbody tr td:first-child a').first().getAttribute('href');
      const m = linkHref?.match(/[?&]id=([^&]+)/);
      if (m) objectId = m[1];
    }

    return { success: true, objectId, message: `对象[${name}]创建成功，objectId=${objectId}` };
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
  const hasFlag = (name) => args.includes(name);

  const name = getArg('--name');
  const code = getArg('--code');
  const enableLifecycle = hasFlag('--enableLifecycle');

  if (!name || !code) {
    console.error('用法: node create-object.js --name 对象名 --code obj_code [--enableLifecycle]');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await createObject(page, { name, code, enableLifecycle });
  console.log(result.message);
  await closeBrowser(browser);
}

module.exports = { createObject, main };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
