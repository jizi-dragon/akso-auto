/**
 * akso-basic-config-api — 可视模式
 *
 * 每 N 秒自动刷新页面，让用户实时看到 API 操作结果。
 * 使用 shared/browser-manager.js 管理浏览器生命周期。
 *
 * @example <caption>在编排脚本中使用</caption>
 * const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
 * const { enableVisibility, disableVisibility } = require('./visibility');
 *
 * const { browser, page } = await launchBrowser();
 * await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
 * enableVisibility(page, 15000);
 * // ... 执行 API 操作 ...
 * disableVisibility();
 * await closeBrowser(browser);
 *
 * @example <caption>直接运行验证</caption>
 * // node scripts/visibility.js
 */

let __aksoRefreshId = null;

function enableVisibility(page, intervalMs = 15000) {
  if (__aksoRefreshId) clearTimeout(__aksoRefreshId);
  const doRefresh = () => {
    console.log('[可视模式] 刷新页面...');
    page.reload().then(() => {
      __aksoRefreshId = setTimeout(doRefresh, intervalMs);
    }).catch(err => {
      console.error('[可视模式] 刷新失败:', err.message);
    });
  };
  __aksoRefreshId = setTimeout(doRefresh, intervalMs);
  console.log(`[可视模式] 已开启，每 ${intervalMs / 1000}s 刷新`);
}

function disableVisibility() {
  if (__aksoRefreshId) {
    clearTimeout(__aksoRefreshId);
    __aksoRefreshId = null;
    console.log('[可视模式] 已关闭');
  }
}

function isVisibilityOn() {
  return !!__aksoRefreshId;
}

module.exports = { enableVisibility, disableVisibility, isVisibilityOn };

if (require.main === module) {
  (async () => {
    const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
    const { browser, page } = await launchBrowser();
    try {
      await login(page);
      enableVisibility(page, 5000);
      console.log('可视模式已开启，10 秒后自动关闭...');
      await new Promise(r => setTimeout(r, 10000));
      disableVisibility();
    } catch (e) {
      console.error('执行异常:', e.message);
    } finally {
      await closeBrowser(browser);
    }
  })();
}
