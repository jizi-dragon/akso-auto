const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const DEFAULT_CDP_PORT = 9222;
const BROWSER_STATE_FILE = path.join(__dirname, '..', 'output', 'qrs', '.qrs-browser.json');
const USER_DATA_DIR = path.join(os.tmpdir(), 'qrs-chrome-profile');

function cdpFetch(port, endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${endpoint}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function launchChromeDetached(cdpPort) {
  const exePath = chromium.executablePath();
  const args = [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    'about:blank'
  ];

  const proc = spawn(exePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  proc.unref();

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      await cdpFetch(cdpPort, '/json/version');
      return { pid: proc.pid, cdpPort };
    } catch {}
  }
  throw new Error('Chrome CDP 启动超时（15s）');
}

async function connectBrowser(cdpUrl) {
  const browser = await chromium.connectOverCDP(cdpUrl);
  return { browser };
}

async function getBrowserInfo(cdpPort) {
  try {
    const version = await cdpFetch(cdpPort, '/json/version');
    const pages = await cdpFetch(cdpPort, '/json');
    return {
      browser: version.Browser,
      userAgent: version['User-Agent'],
      pageCount: pages.length,
      pages: pages.map(p => ({ id: p.id, title: p.title, url: p.url }))
    };
  } catch {
    return null;
  }
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

async function disconnectBrowser(browser) {
  try { await browser.close(); } catch {}
}

async function closeRemoteBrowser(browser) {
  try {
    const contexts = browser.contexts();
    for (const ctx of contexts) {
      const pages = ctx.pages();
      if (pages.length > 0) {
        const cdp = await ctx.newCDPSession(pages[0]);
        await cdp.send('Browser.close');
        return;
      }
    }
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Browser.close');
  } catch {}
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

function saveBrowserState(cdpPort) {
  const dir = path.dirname(BROWSER_STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BROWSER_STATE_FILE, JSON.stringify({
    cdpPort,
    cdpUrl: `http://127.0.0.1:${cdpPort}`,
    launchedAt: new Date().toISOString()
  }, null, 2), 'utf-8');
}

function readBrowserState() {
  if (!fs.existsSync(BROWSER_STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BROWSER_STATE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function deleteBrowserState() {
  try { fs.unlinkSync(BROWSER_STATE_FILE); } catch {}
}

module.exports = {
  launchChromeDetached, connectBrowser, getBrowserInfo, login, closeBrowser,
  disconnectBrowser, closeRemoteBrowser, dismissAllPopups,
  saveBrowserState, readBrowserState, deleteBrowserState,
  DEFAULT_CDP_PORT, BROWSER_STATE_FILE
};
