/**
 * Akso eGMP 登录原子模块 — v2.0
 * 
 * 用法（模块调用）：
 *   const { login } = require('./login.js');
 *   const result = await login(page, { baseUrl, username, password });
 * 
 * 用法（独立运行）：
 *   node login.js --username liyulong --password 88888888 --baseUrl https://standard-val.aksoegmp.com
 * 
 * 返回：{ success: boolean, url: string, error?: string }
 */
const { chromium } = require('playwright');
const { launchBrowser, closeBrowser, dismissAllPopups } = require('../../shared/browser-manager');

async function login(page, opts = {}) {
  const username = opts.username || process.env.AKSO_USERNAME || 'liyulong';
  const password = opts.password || process.env.AKSO_PASSWORD || '88888888';
  const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

  try {
    await page.goto(baseUrl + '/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.getByRole('textbox', { name: '请输入用户名' }).fill(username);

    const pwFrame = page.frameLocator('iframe').first();
    await pwFrame.getByRole('textbox', { name: '请输入密码' }).fill(password);

    const checkbox = page.getByRole('checkbox', { name: '已阅读并同意' });
    if (!(await checkbox.isChecked())) { await checkbox.click(); }
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: '登录' }).click();

    try {
      await page.waitForURL('**/web**', { timeout: 20000 });
    } catch (e) {
      await page.waitForTimeout(5000);
    }

    return { success: page.url().includes('/web'), url: page.url() };
  } catch (e) {
    return { success: false, url: page.url(), error: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const username = getArg('--username') || process.env.AKSO_USERNAME || 'liyulong';
  const password = getArg('--password') || process.env.AKSO_PASSWORD || '88888888';
  const baseUrl = getArg('--baseUrl') || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

  console.log(`登录目标：${baseUrl}`);
  const { browser, page } = await launchBrowser({ headless: false });
  const result = await login(page, { baseUrl, username, password });
  console.log(result.success ? '登录成功' : '登录失败', result.url);
  await closeBrowser(browser);
}

module.exports = { login, main };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
