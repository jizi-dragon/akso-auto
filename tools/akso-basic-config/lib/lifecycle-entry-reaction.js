/**
 * Akso eGMP 创建进入动作原子模块
 *
 * URL 模式：/admin/config/lifecycle/{lifecycleId}/status/{statusId}/entry-reaction/00000000-...-0000?__edit=1
 *
 * 表单结构：
 *   - textbox "请输入描述"
 *   - Radio：总是执行 / 有条件地执行
 *   - 第 1 个 Select：动作类型（约 130 种）
 *   - 不同动作类型展开不同子表单
 *   - button "添加动作"（⚠️ 不要误点，填完第一个直接保存）
 *
 * 用法（模块调用）：
 *   const { createEntryReaction } = require('./lifecycle-entry-reaction.js');
 *   const result = await createEntryReaction(page, {
 *     lifecycleId: 'xxx', statusId: 'xxx',
 *     execMode: 'always',
 *     desc: '进入状态时自动发通知',
 *     actionType: '发送通知',           // 动作类型
 *     actionSub: {                       // 动作子参数（按动作类型不同）
 *       template: 'QMS待办任务通知',     // 通知模板
 *       recipient: '查看者'              // 收件人
 *     }
 *   });
 *
 * 用法（独立运行）：
 *   node lifecycle-entry-reaction.js --lifecycleId xxx --statusId xxx --desc 描述 --actionType 发送通知
 *
 * 返回：{ success: boolean, reactionId?: string, message: string }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
const { selectAntOption } = require('./lifecycle-entry-condition.js');

async function createEntryReaction(page, opts = {}) {
  const lifecycleId = opts.lifecycleId;
  const statusId = opts.statusId;
  const execMode = opts.execMode || 'always';
  const desc = opts.desc || '';
  const actionType = opts.actionType || '发送通知';
  const actionSub = opts.actionSub || {};

  if (!lifecycleId || !statusId) {
    return { success: false, message: 'Missing lifecycleId/statusId' };
  }

  try {
    const baseUrl = opts.baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

    await page.goto(
      `${baseUrl}/admin/config/lifecycle/${lifecycleId}/status/${statusId}/entry-reaction/00000000-0000-0000-0000-000000000000?__edit=1`,
      { waitUntil: 'networkidle', timeout: 15000 }
    );
    await page.waitForTimeout(1500);

    // Fill description
    if (desc) {
      await page.getByPlaceholder('请输入描述').fill(desc);
      await page.waitForTimeout(300);
    }

    // Select execution mode
    if (execMode === 'conditional') {
      await page.locator('.ant-radio-wrapper').filter({ hasText: '有条件地执行' }).click();
      await page.waitForTimeout(300);
    }

    // Select action type (Select index 0)
    await selectAntOption(page, 0, actionType);

    // Fill action-specific sub-parameters based on action type
    if (actionType.includes('发送通知')) {
      // Select 1: 通知模板
      if (actionSub.template) await selectAntOption(page, 1, actionSub.template);
      // Select 2: 收件人
      if (actionSub.recipient) await selectAntOption(page, 2, actionSub.recipient);
    } else if (actionType.includes('修改状态') || actionType.includes('修改记录字段')) {
      // Sub-params vary by action type - select from available selects
      if (actionSub.targetState) {
        const count = await page.locator('.ant-select-selector').count();
        if (count > 1) await selectAntOption(page, 1, actionSub.targetState);
      }
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
    const idMatch = url.match(/\/entry-reaction\/([a-f0-9-]{30,})\?/);
    const reactionId = idMatch ? idMatch[1] : null;

    if (reactionId && reactionId !== '00000000-0000-0000-0000-000000000000') {
      return { success: true, reactionId, message: `进入动作创建成功，reactionId=${reactionId}` };
    }
    return { success: true, message: `进入动作创建成功，URL=${url}` };
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
  const actionType = getArg('--actionType') || '发送通知';
  const template = getArg('--template') || '';
  const recipient = getArg('--recipient') || '';

  if (!lifecycleId || !statusId) {
    console.error('用法: node lifecycle-entry-reaction.js --lifecycleId <id> --statusId <id> [--desc 描述] [--actionType 类型]');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await createEntryReaction(page, {
    lifecycleId, statusId, desc, actionType,
    actionSub: { template, recipient }
  });
  console.log(result.message);
  await closeBrowser(browser);
}

module.exports = { createEntryReaction, main };

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
