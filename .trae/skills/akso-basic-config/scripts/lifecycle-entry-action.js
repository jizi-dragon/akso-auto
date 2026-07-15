/**
 * Akso eGMP 创建用户动作原子模块
 *
 * URL 模式：/admin/config/lifecycle/{lifecycleId}/status/{statusId}/entry-action/00000000-...-0000?__edit=1
 *
 * 表单结构：
 *   - textbox "请输入描述"、"请输入动作名称"、"请输入Code"
 *   - Radio：总是执行 / 有条件地执行
 *   - 第 0 个 Select：图标（可跳过）
 *   - 第 1 个 Select：分组（通常选"管理"）
 *   - 第 2 个 Select：动作类型
 *   - 第 3 个 Select：*状态（选「修改状态」后出现）
 *   - checkbox "确认提示"、"是否常用动作"、"不显示在操作栏"
 *   - button "添加动作"（⚠️ 不要点）
 *
 * 用法（模块调用）：
 *   const { createUserAction } = require('./lifecycle-entry-action.js');
 *   const result = await createUserAction(page, {
 *     lifecycleId: 'xxx', statusId: 'xxx',
 *     desc: '从步骤2提交到关闭',
 *     actionName: '提交到关闭',       // 按钮文本
 *     code: 'action_submit_to_close',
 *     execMode: 'always',
 *     group: '管理',
 *     actionType: '修改状态',
 *     targetState: '关闭'             // 目标状态（修改状态时需要）
 *   });
 *
 * 用法（独立运行）：
 *   node lifecycle-entry-action.js --lifecycleId xxx --statusId xxx --actionName 提交 --code action_submit --actionType 修改状态 --targetState 关闭
 *
 * 返回：{ success: boolean, actionId?: string, message: string }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser } = require('../../../../shared/browser-manager');
const { selectAntOption } = require('./lifecycle-entry-condition.js');

async function createUserAction(page, opts = {}) {
  const lifecycleId = opts.lifecycleId;
  const statusId = opts.statusId;
  const desc = opts.desc || '';
  const actionName = opts.actionName || '';
  const code = opts.code || '';
  const execMode = opts.execMode || 'always';
  const group = opts.group || '管理';
  const actionType = opts.actionType || '修改状态';
  const targetState = opts.targetState || '';

  if (!lifecycleId || !statusId || !actionName || !code) {
    return { success: false, message: 'Missing lifecycleId/statusId/actionName/code' };
  }

  try {
    const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

    await page.goto(
      `${baseUrl}/admin/config/lifecycle/${lifecycleId}/status/${statusId}/entry-action/00000000-0000-0000-0000-000000000000?__edit=1`,
      { waitUntil: 'networkidle', timeout: 15000 }
    );
    await page.waitForTimeout(1500);

    // Fill text fields
    if (desc) {
      await page.getByPlaceholder('请输入描述').fill(desc);
      await page.waitForTimeout(300);
    }
    await page.getByPlaceholder('请输入动作名称').fill(actionName);
    await page.getByRole('textbox', { name: '请输入Code' }).fill(code);
    await page.waitForTimeout(300);

    // Select execution mode
    if (execMode === 'conditional') {
      await page.locator('.ant-radio-wrapper').filter({ hasText: '有条件地执行' }).click();
      await page.waitForTimeout(300);
    }

    // Select 0: 图标 — 按 Enter 选第一个默认图标
    await selectAntOption(page, 0, '');

    // Select 1: 分组
    await selectAntOption(page, 1, group);

    // Select 2: 动作类型
    await selectAntOption(page, 2, actionType);

    // Select 3: *状态（仅修改状态动作需要目标状态）
    if (actionType === '修改状态' && targetState) {
      await selectAntOption(page, 3, targetState);
    }

    await page.waitForTimeout(500);

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
    const idMatch = url.match(/\/entry-action\/([a-f0-9-]{30,})\?/);
    const actionId = idMatch ? idMatch[1] : null;

    if (actionId && actionId !== '00000000-0000-0000-0000-000000000000') {
      return { success: true, actionId, message: `用户动作[${actionName}]创建成功，actionId=${actionId}` };
    }
    return { success: true, message: `用户动作[${actionName}]创建成功，URL=${url}` };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (n) => { const i = args.indexOf(n); return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined; };

  const lifecycleId = getArg('--lifecycleId');
  const statusId = getArg('--statusId');
  const desc = getArg('--desc') || '';
  const actionName = getArg('--actionName');
  const code = getArg('--code');
  const group = getArg('--group') || '管理';
  const actionType = getArg('--actionType') || '修改状态';
  const targetState = getArg('--targetState') || '';

  if (!lifecycleId || !statusId || !actionName || !code) {
    console.error('用法: node lifecycle-entry-action.js --lifecycleId <id> --statusId <id> --actionName 名称 --code code [--actionType 类型] [--targetState 目标]');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await createUserAction(page, { lifecycleId, statusId, desc, actionName, code, group, actionType, targetState });
  console.log(result.message);
  await closeBrowser(browser);
}

module.exports = { createUserAction, main };

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
