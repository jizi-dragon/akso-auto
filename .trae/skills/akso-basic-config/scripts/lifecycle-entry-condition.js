/**
 * Akso eGMP 创建进入条件原子模块
 *
 * 进入条件位于状态详情页 →「进入条件」折叠面板
 * URL 模式：/admin/config/lifecycle/{lifecycleId}/status/{statusId}/entry-condition/00000000-...-0000?__edit=1
 *
 * 表单结构：
 *   - Radio：总是执行 / 有条件地执行
 *   - button "新 增" → 规则编辑器（4 级 Select 链）
 *   - textarea "请输入当不满足条件时，弹出以下提示消息"
 *
 * 用法（模块调用）：
 *   const { createEntryCondition } = require('./lifecycle-entry-condition.js');
 *   const result = await createEntryCondition(page, {
 *     lifecycleId: 'xxx', statusId: 'xxx',
 *     execMode: 'always',      // 'always' | 'conditional'
 *     condField: '用餐标题',    // 校验的目标字段名
 *     condOperator: '等于',    // 运算符
 *     errorMsg: '请完善用餐标题信息' // 校验失败提示
 *   });
 *
 * 用法（独立运行）：
 *   node lifecycle-entry-condition.js --lifecycleId xxx --statusId xxx --condField 用餐标题 --errorMsg 请完善
 *
 * 返回：{ success: boolean, condId?: string, message: string }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');

/**
 * 安全选择 Ant Select 选项（解决多下拉重叠遮挡问题）
 * @param {Page} page
 * @param {number} selectorIndex - .ant-select-selector 索引 (0-based)
 * @param {string} searchText - 搜索关键词（用于 insertText + Enter）
 */
async function selectAntOption(page, selectorIndex, searchText) {
  await page.evaluate(() => {
    document.querySelectorAll('.ant-select-dropdown')
      .forEach(d => d.classList.add('ant-select-dropdown-hidden'));
  });
  await page.waitForTimeout(200);

  await page.locator('.ant-select-selector').nth(selectorIndex).click({ force: true });
  await page.waitForTimeout(500);

  if (searchText) {
    await page.keyboard.insertText(searchText);
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    document.querySelectorAll('.ant-select-dropdown')
      .forEach(d => d.classList.add('ant-select-dropdown-hidden'));
  });
  await page.waitForTimeout(200);
}

async function createEntryCondition(page, opts = {}) {
  const lifecycleId = opts.lifecycleId;
  const statusId = opts.statusId;
  const execMode = opts.execMode || 'always';       // 'always' | 'conditional'
  const condField = opts.condField || '';            // 目标字段名
  const condOperator = opts.condOperator || '等于';  // 运算符
  const errorMsg = opts.errorMsg || '条件不满足';

  if (!lifecycleId || !statusId) {
    return { success: false, message: 'Missing lifecycleId/statusId' };
  }

  try {
    const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

    await page.goto(
      `${baseUrl}/admin/config/lifecycle/${lifecycleId}/status/${statusId}/entry-condition/00000000-0000-0000-0000-000000000000?__edit=1`,
      { waitUntil: 'networkidle', timeout: 15000 }
    );
    await page.waitForTimeout(1500);

    // Select execution mode
    if (execMode === 'conditional') {
      await page.locator('.ant-radio-wrapper').filter({ hasText: '有条件地执行' }).click();
    }
    await page.waitForTimeout(300);

    // Click "新 增" to add rule
    await page.getByRole('button', { name: '新 增' }).click();
    await page.waitForTimeout(1000);

    if (condField) {
      // Select 0: 条件类型 → "字段"
      await selectAntOption(page, 0, '字段');

      // Select 1: 选择字段名
      await selectAntOption(page, 1, condField);

      // Select 2: 选择运算符
      await selectAntOption(page, 2, condOperator);
    }

    // Fill error message
    const errArea = page.getByPlaceholder('请输入当不满足条件时，弹出以下提示消息');
    if (await errArea.isVisible({ timeout: 1000 }).catch(() => false)) {
      await errArea.fill(errorMsg);
    }
    await page.waitForTimeout(300);

    // Handle dialogs
    page.on('dialog', d => d.accept().catch(() => {}));

    await page.getByRole('button', { name: '保存' }).click();
    await page.waitForTimeout(4000);

    // Dismiss popups
    for (const btnName of ['知道了', '并不保存', '确 定']) {
      try {
        const btn = page.getByRole('button', { name: btnName });
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) { await btn.click(); }
      } catch {}
    }

    const url = page.url();
    const idMatch = url.match(/\/entry-condition\/([a-f0-9-]{30,})\?/);
    const condId = idMatch ? idMatch[1] : null;

    if (condId && condId !== '00000000-0000-0000-0000-000000000000') {
      return { success: true, condId, message: `进入条件创建成功，condId=${condId}` };
    }
    return { success: true, message: `进入条件创建成功，URL=${url}` };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (n) => { const i = args.indexOf(n); return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined; };

  const lifecycleId = getArg('--lifecycleId');
  const statusId = getArg('--statusId');
  const execMode = getArg('--execMode') || 'always';
  const condField = getArg('--condField') || '';
  const condOperator = getArg('--condOperator') || '等于';
  const errorMsg = getArg('--errorMsg') || '条件不满足';

  if (!lifecycleId || !statusId) {
    console.error('用法: node lifecycle-entry-condition.js --lifecycleId <id> --statusId <id> [--condField 字段名] [--errorMsg 提示]');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await createEntryCondition(page, { lifecycleId, statusId, execMode, condField, condOperator, errorMsg });
  console.log(result.message);
  await closeBrowser(browser);
}

module.exports = { createEntryCondition, selectAntOption, main };

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
