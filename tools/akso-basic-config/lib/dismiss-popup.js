/**
 * Akso eGMP 弹窗清除原子模块 — v2.0
 * 
 * 用法（模块调用）：
 *   const { dismissAllPopups } = require('./dismiss-popup.js');
 *   const { dismissed } = await dismissAllPopups(page);
 * 
 * 检测并关闭 5 类系统弹窗：
 *   - "知道了"（名称/Code重复、必填校验）
 *   - "并不保存"（未保存离开确认）
 *   - "确 定"（操作确认）
 *   - "同 意"（隐私协议）
 *   - browser beforeunload dialog
 * 
 * 返回：{ dismissed: string[] }
 */
const { chromium } = require('playwright');
const { launchBrowser, login, closeBrowser, dismissAllPopups: sharedDismiss } = require('../../shared/browser-manager');

async function dismissAllPopups(page) {
  const dismissed = [];
  const popupPatterns = ['知道了', '并不保存', '确 定', '同 意'];

  for (const name of popupPatterns) {
    try {
      const btn = page.getByRole('button', { name }).first();
      await btn.waitFor({ state: 'visible', timeout: 600 });
      await btn.click();
      dismissed.push(name);
      await page.waitForTimeout(400);
    } catch {}
  }

  try {
    const hasDialog = await page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = () => resolve(true);
        window.addEventListener('beforeunload', handler, { once: true });
        setTimeout(() => { window.removeEventListener('beforeunload', handler); resolve(false); }, 500);
      });
    });
    if (hasDialog) dismissed.push('beforeunload');
  } catch {}

  return { dismissed };
}

module.exports = { dismissAllPopups };
