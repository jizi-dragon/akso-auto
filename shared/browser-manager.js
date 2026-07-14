const { chromium } = require('playwright');

async function launchBrowser(opts = {}) {
  const headless = opts.headless !== undefined ? opts.headless : false;
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, context, page };
}

async function login(page, config = {}) {
  const baseUrl = config.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';
  const username = config.username || process.env.AKSO_USERNAME || 'liyulong';
  const password = config.password || process.env.AKSO_PASSWORD || '88888888';

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

  const success = page.url().includes('/web');
  return { success, url: page.url() };
}

async function closeBrowser(browser) {
  const contexts = browser.contexts();
  for (const ctx of contexts) {
    await ctx.close();
  }
  await browser.close();
}

async function dismissAllPopups(page) {
  const dismissed = [];
  for (const name of ['知道了', '并不保存', '确 定', '同 意']) {
    try {
      const btn = page.getByRole('button', { name });
      if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
        await btn.click();
        dismissed.push(name);
        await page.waitForTimeout(400);
      }
    } catch {}
  }
  return dismissed;
}

module.exports = { launchBrowser, login, closeBrowser, dismissAllPopups };
