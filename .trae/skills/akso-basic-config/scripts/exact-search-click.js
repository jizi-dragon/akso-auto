/**
 * Akso eGMP 精确搜索+点击原子模块 — v3.0
 * 参考：tools/form-analyzer/index.js — 分页遍历 + 多 selector + ID 直达
 * 
 * 用法（模块调用）：
 *   const { exactSearchClick } = require('./exact-search-click.js');
 *   const result = await exactSearchClick(page, { keyword, exactName, listUrl, baseUrl });
 * 
 * 用法（独立运行）：
 *   node exact-search-click.js --keyword 关键词 --exactName 精确名称 --listUrl /admin/config/basic-objects/list
 * 
 * 流程：导航列表页 → 多 selector 定位搜索框 → click 清空 fill Enter → 分页遍历读表格 → 精确匹配 → goto ID URL
 * 返回：{ found: boolean, exactMatch?: boolean, clickedName?: string, clickedId?: string, url?: string, candidates: string[] }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../../../shared/browser-manager');

async function exactSearchClick(page, opts = {}) {
  const keyword   = opts.keyword;
  const exactName = opts.exactName;
  const listUrl   = opts.listUrl;

  if (!keyword || !exactName || !listUrl) {
    return { found: false, candidates: [], error: 'Missing params: keyword, exactName, listUrl' };
  }

  try {
    const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);

    const inputs = page.locator('.ant-input-search input, .ant-input-affix-wrapper input, input.ant-input');
    if (await inputs.count() > 0) {
      await inputs.first().click();
      await inputs.first().fill('');
      await page.waitForTimeout(300);
      await inputs.first().fill(keyword);
      await page.waitForTimeout(500);
      await inputs.first().press('Enter');
      await page.waitForTimeout(2000);
    }

    let exactCandidate = null;
    let partialCandidate = null;
    const allCandidates = [];

    for (let p = 0; p < 10; p++) {
      if (p > 0) {
        const nb = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
        if (await nb.count() === 0) break;
        await nb.first().click();
        await page.waitForTimeout(2000);
      }

      const candidates = await page.evaluate((t) => {
        const result = [];
        const rows = document.querySelectorAll('table tbody tr, .ant-table-tbody tr');
        for (const row of rows) {
          const text = (row.textContent || '').trim();
          if (text.includes(t)) {
            const key = row.getAttribute('data-row-key');
            const link = row.querySelector('a');
            let hid = '';
            if (link) { const m = (link.getAttribute('href') || '').match(/[?&]id=([^&]+)/); if (m) hid = m[1]; }
            const cells = row.querySelectorAll('td');
            const firstCellText = cells.length > 0 ? (cells[0].textContent || '').trim() : '';
            result.push({ id: key || hid || '', name: firstCellText || text.split('\n')[0].trim() });
          }
        }
        return result;
      }, keyword);

      for (const c of candidates) {
        allCandidates.push(c);
        if (c.name === exactName) { exactCandidate = c; break; }
        if (!partialCandidate) { partialCandidate = c; }
      }
      if (exactCandidate) break;
    }

    const final = exactCandidate || partialCandidate;
    if (final) {
      if (final.id) {
        await page.goto(baseUrl + '/admin/config/basic-objects/edit/base?id=' + final.id);
      } else {
        await page.getByRole('link', { name: final.name }).first().click();
      }
      await page.waitForTimeout(2000);
    }

    return {
      found: !!final,
      exactMatch: !!exactCandidate,
      clickedName: final ? final.name : null,
      clickedId: final ? final.id : null,
      url: page.url(),
      candidates: allCandidates.map(c => c.name)
    };
  } catch (e) {
    return { found: false, candidates: [], error: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const keyword   = getArg('--keyword');
  const exactName = getArg('--exactName');
  const listUrl   = getArg('--listUrl');
  const baseUrl   = getArg('--baseUrl');

  if (!keyword || !exactName || !listUrl) {
    console.error('用法: node exact-search-click.js --keyword 关键词 --exactName 精确名称 --listUrl /admin/config/basic-objects/list [--baseUrl https://...]');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page, { baseUrl });
  const result = await exactSearchClick(page, { keyword, exactName, listUrl, baseUrl });
  console.log(JSON.stringify(result, null, 2));
  await closeBrowser(browser);
}

module.exports = { exactSearchClick, main };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
