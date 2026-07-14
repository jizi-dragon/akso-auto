/**
 * Akso eGMP 保存+验证原子模块 — v2.0
 * 
 * 用法（模块调用）：
 *   const { saveAndVerify } = require('./save-and-verify.js');
 *   const result = await saveAndVerify(page, { expectedUrlPattern });
 * 
 * 用法（独立运行）：
 *   node save-and-verify.js --expectedUrlPattern "/edit/fields"
 * 
 * 返回：{ saved: boolean, url: string, popups: string[] }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../../../shared/browser-manager');

async function saveAndVerify(page, opts = {}) {
  const expectedPattern = opts.expectedUrlPattern;

  try {
    await page.getByRole('button', { name: 'save 保存' }).click();
    await page.waitForTimeout(2500);

    const popups = await dismissAllPopups(page);
    const url = page.url();
    const saved = expectedPattern ? url.includes(expectedPattern) : true;

    return { saved, url, popups };
  } catch (e) {
    return { saved: false, url: page.url(), popups: [], error: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const expectedUrlPattern = getArg('--expectedUrlPattern');

  if (!expectedUrlPattern) {
    console.error('用法: node save-and-verify.js --expectedUrlPattern "/edit/fields"');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await saveAndVerify(page, { expectedUrlPattern });
  console.log(`保存验证：${result.saved ? '成功' : '失败'} — URL: ${result.url}, 弹窗: ${JSON.stringify(result.popups)}`);
  await closeBrowser(browser);
}

module.exports = { saveAndVerify, main };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
