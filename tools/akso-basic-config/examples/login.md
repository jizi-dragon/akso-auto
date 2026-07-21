# 示例：一键登录

> 对应 Skill 指令：`1.2.6`
> 目标：通过脚本或模块模式完成 Akso 系统登录

## 前置条件

- 已安装 `playwright` npm 包
- 已知环境 URL、用户名、密码
- 首次运行需执行 `npx playwright install chromium`

---

## 方式一：脚本命令（推荐）

```bash
node lib/login.js --baseUrl https://standard-val.aksoegmp.com --username liyulong --password 88888888
```

支持的环境变量替代：

```bash
SET AKSO_BASE_URL=https://standard-val.aksoegmp.com
SET AKSO_USERNAME=liyulong
SET AKSO_PASSWORD=88888888
node lib/login.js
```

### 脚本实现参考

`lib/login.js` 核心逻辑：

```js
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');

async function main() {
  const baseUrl = process.env.AKSO_BASE_URL || process.argv[3];
  const username = process.env.AKSO_USERNAME || process.argv[5];
  const password = process.env.AKSO_PASSWORD || process.argv[7];

  const { browser, page } = await launchBrowser();
  const result = await login(page, { baseUrl, username, password });

  if (result.success) {
    console.log('登录成功:', result.url);
    return page; // 返回 page 供后续操作
  } else {
    console.error('登录失败');
    await closeBrowser(browser);
    process.exit(1);
  }
}

main();
```

---

## 方式二：require 模块模式

直接在你的脚本中引入 `shared/browser-manager.js`：

```js
const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');

async function doWork() {
  const { browser, page } = await launchBrowser();

  const result = await login(page, {
    baseUrl: 'https://standard-val.aksoegmp.com',
    username: 'liyulong',
    password: '88888888'
  });

  if (!result.success) {
    console.error('登录失败');
    await closeBrowser(browser);
    return;
  }

  console.log('已登录，URL:', page.url());

  // 后续业务操作...

  await closeBrowser(browser);
}

doWork();
```

---

## 方式三：手写登录逻辑

如果需要精细控制登录流程（如跳过协议勾选、自定义超时），可直接用 `playwright` API：

```js
const { chromium } = require('playwright');

async function manualLogin(config) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(config.baseUrl + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.getByRole('textbox', { name: '请输入用户名' }).fill(config.username);

  const pwFrame = page.frameLocator('iframe').first();
  await pwFrame.getByRole('textbox', { name: '请输入密码' }).fill(config.password);

  const checkbox = page.getByRole('checkbox', { name: '已阅读并同意' });
  if (!(await checkbox.isChecked())) {
    await checkbox.click();
  }
  await page.waitForTimeout(300);

  await page.getByRole('button', { name: '登录' }).click();

  try {
    await page.waitForURL('**/web**', { timeout: 20000 });
  } catch (e) {
    await page.waitForTimeout(5000);
  }

  return { browser, page, success: page.url().includes('/web') };
}
```

---

## 预期结果

- 页面 URL 从 `/login` 跳转到 `/web`
- 页面标题显示 `Akso eGMP (配置)`
- 右上角显示当前用户名称

## 耗时参考

| 方式 | 复杂度 | 适用场景 |
|------|:---:|------|
| 脚本命令 | 低 | 日常开发，一键执行 |
| require 模块 | 中 | 嵌入自定义工具 |
| 手写逻辑 | 高 | 需要特殊定制 |

## 环境切换

不同环境只需修改参数：

```bash
# 开发环境
node lib/login.js --baseUrl https://dev.aksoegmp.com --username dev_user --password dev123

# 测试环境
node lib/login.js --baseUrl https://test.aksoegmp.com --username tester --password test456

# 生产环境（通过环境变量传，避免命令行泄露）
SET AKSO_BASE_URL=https://prod.aksoegmp.com
SET AKSO_USERNAME=prod_user
SET AKSO_PASSWORD=xxxxxxxx
node lib/login.js
```
