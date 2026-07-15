/**
 * Akso eGMP 创建生命周期状态原子模块
 *
 * 用法（模块调用）：
 *   const { createStatus } = require('./lifecycle-create-state.js');
 *   const result = await createStatus(page, {
 *     lifecycleId: 'xxx',
 *     name: '步骤1', code: 'status_step1__c', desc: '描述'
 *   });
 *
 * 用法（独立运行）：
 *   node lifecycle-create-state.js --lifecycleId xxx --name 步骤1 --code status_step1__c
 *
 * 返回：{ success: boolean, statusId?: string, message: string }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');

async function createStatus(page, opts = {}) {
  const lifecycleId = opts.lifecycleId;
  const name = opts.name;
  const code = opts.code;
  const desc = opts.desc || '';

  if (!lifecycleId || !name || !code) {
    return { success: false, message: 'Missing lifecycleId/name/code' };
  }

  try {
    const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

    await page.goto(`${baseUrl}/admin/config/lifecycle/${lifecycleId}/status/00000000-0000-0000-0000-000000000000`, {
      waitUntil: 'networkidle', timeout: 15000
    });
    await page.waitForTimeout(1500);

    await page.getByPlaceholder('请输入名称').fill(name);
    await page.getByRole('textbox', { name: '请输入Code' }).fill(code);
    if (desc) {
      await page.getByPlaceholder('请输入描述').fill(desc);
    }
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: '保存' }).click();
    await page.waitForTimeout(3000);

    // Dismiss popups
    for (const btnName of ['知道了', '并不保存', '确 定']) {
      try {
        const btn = page.getByRole('button', { name: btnName });
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) { await btn.click(); }
      } catch {}
    }

    const url = page.url();
    const idMatch = url.match(/\/status\/([a-f0-9-]{30,})\?/);
    const statusId = idMatch ? idMatch[1] : null;

    if (statusId && statusId !== '00000000-0000-0000-0000-000000000000') {
      return { success: true, statusId, message: `状态[${name}]创建成功，statusId=${statusId}` };
    }
    return { success: true, message: `状态[${name}]创建成功（无法提取 statusId），URL=${url}` };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (n) => { const i = args.indexOf(n); return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined; };

  const lifecycleId = getArg('--lifecycleId');
  const name = getArg('--name');
  const code = getArg('--code');
  const desc = getArg('--desc');

  if (!lifecycleId || !name || !code) {
    console.error('用法: node lifecycle-create-state.js --lifecycleId <id> --name 名称 --code code [--desc 描述]');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await createStatus(page, { lifecycleId, name, code, desc });
  console.log(result.message);
  await closeBrowser(browser);
}

module.exports = { createStatus, main };

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
