# 示例：批量创建选项集

> 对应 Skill 指令：第三章
> 前置：已登录并进入配置端

---

## 方式一：脚本命令（推荐）

```bash
node scripts/create-option-set.js --name "优先级" --code "option_priority" --options "高,high;中,medium;低,low"
```

参数说明：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--name` | 选项集名称 | 必填 |
| `--code` | 选项集 Code | 必填 |
| `--options` | 选项值列表，格式 `显示值,存储值;显示值,存储值` | 空（仅创建空选项集） |
| `--baseUrl` | 系统地址 | 环境变量 `AKSO_BASE_URL` |

### 脚本实现参考

`scripts/create-option-set.js` 核心逻辑：

```js
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../shared/browser-manager');

async function createOptionSet(page, opts) {
  // Step 1: 导航到选项集列表
  await page.goto(page.__baseUrl + '/admin/config/pick-list/list', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Step 2: 点击创建
  await page.getByRole('button', { name: '创 建' }).click();
  await page.waitForTimeout(1500);

  // Step 3: 填写名称和 Code
  await page.getByRole('textbox', { name: '请输入此字段' }).fill(opts.name);
  await page.getByRole('textbox', { name: '请输入Code' }).fill(opts.code);

  // Step 4: 批量添加选项值
  if (opts.optionItems && opts.optionItems.length > 0) {
    await page.getByRole('button', { name: /批量添加/ }).click();
    await page.waitForTimeout(500);

    const text = opts.optionItems
      .map(item => item.label + ',' + item.value)
      .join('\n');

    await page.locator('.ant-modal textarea').fill(text);
    await page.getByRole('button', { name: '确 定' }).click();
    await page.waitForTimeout(500);
  }

  // Step 5: 保存
  await page.getByRole('button', { name: 'save 保存' }).click();
  await page.waitForTimeout(3000);

  // Step 6: 验证
  const url = page.url();
  const success = url.includes('/admin/config/pick-list/list');
  console.log(success ? '选项集创建成功' : '可能仍在编辑页');
  return { success };
}

function parseOptions(raw) {
  if (!raw) return [];
  return raw.split(';').map(pair => {
    const [label, value] = pair.split(',');
    return { label: label.trim(), value: value.trim() };
  });
}

async function main() {
  const args = parseArgs();
  const { browser, page } = await launchBrowser();
  page.__baseUrl = args.baseUrl;

  await login(page, args);
  await dismissAllPopups(page);

  const result = await createOptionSet(page, {
    name: args.name,
    code: args.code,
    optionItems: parseOptions(args.options)
  });

  await closeBrowser(browser);
  return result;
}

main();
```

---

## 方式二：require 模块模式

嵌入自定义脚本时直接写步骤：

```js
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../shared/browser-manager');

async function createMyOptionSet() {
  const { browser, page } = await launchBrowser();
  page.__baseUrl = 'https://standard-val.aksoegmp.com';

  await login(page, {
    baseUrl: page.__baseUrl,
    username: 'liyulong',
    password: '88888888'
  });
  await dismissAllPopups(page);

  // Step 1: 导航到选项集列表
  await page.goto(page.__baseUrl + '/admin/config/pick-list/list', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Step 2: 点击创建
  await page.getByRole('button', { name: '创 建' }).click();
  await page.waitForTimeout(1500);

  // Step 3: 填写名称和 Code
  await page.getByRole('textbox', { name: '请输入此字段' }).fill('优先级');
  await page.getByRole('textbox', { name: '请输入Code' }).fill('option_priority');

  // Step 4: 批量添加选项值
  await page.getByRole('button', { name: /批量添加/ }).click();
  await page.waitForTimeout(500);

  const optionText = `高,high
中,medium
低,low`;

  await page.locator('.ant-modal textarea').fill(optionText);
  await page.getByRole('button', { name: '确 定' }).click();
  await page.waitForTimeout(500);

  // Step 5: 保存
  await page.getByRole('button', { name: 'save 保存' }).click();
  await page.waitForTimeout(3000);

  // Step 6: 验证
  const url = page.url();
  if (url.includes('/admin/config/pick-list/list')) {
    console.log('保存成功');
  } else {
    console.log('仍在编辑页，请检查');
  }

  await closeBrowser(browser);
}

createMyOptionSet();
```

---

## 操作步骤详解

### Step 1：导航到选项集列表

```js
await page.goto(baseUrl + '/admin/config/pick-list/list', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
```

### Step 2：点击创建

```js
await page.getByRole('button', { name: '创 建' }).click();
await page.waitForTimeout(1500);
```

### Step 3：填写名称和 Code

```js
await page.getByRole('textbox', { name: '请输入此字段' }).fill('优先级');
await page.getByRole('textbox', { name: '请输入Code' }).fill('option_priority');
```

### Step 4：批量添加选项值

```js
await page.getByRole('button', { name: /批量添加/ }).click();
await page.waitForTimeout(500);

const optionText = `高,high
中,medium
低,low`;

await page.locator('.ant-modal textarea').fill(optionText);
await page.getByRole('button', { name: '确 定' }).click();
await page.waitForTimeout(500);
```

> 批量添加对话框中的文本格式：每行一个选项，格式为 `显示值,存储值`。

### Step 5：保存

```js
await page.getByRole('button', { name: 'save 保存' }).click();
await page.waitForTimeout(3000);
```

### Step 6：验证

```js
const url = page.url();
if (url.includes('/admin/config/pick-list/list')) {
  console.log('选项集已保存，已返回列表页');
}
```

---

## 备选：逐行添加（仅 1 个选项时使用）

当选项数量很少时，可以逐个添加而非使用批量对话框：

```js
// 点击"添加选项"按钮
await page.getByRole('button', { name: /添加选项/ }).click();
await page.waitForTimeout(500);

// 填写第一行选项的名称和 Code
const textboxes = page.getByRole('textbox');
await textboxes.nth(2).fill('高');
await textboxes.nth(3).fill('high');

// 添加第二个选项
await page.getByRole('button', { name: /添加选项/ }).click();
await page.waitForTimeout(300);
await textboxes.nth(4).fill('中');
await textboxes.nth(5).fill('medium');

// 保存
await page.getByRole('button', { name: 'save 保存' }).click();
```

## 批量添加 vs 逐行添加对照

| 方式 | 3 个选项的 API 调用 | 耗时 |
|------|:---:|------|
| 批量添加 | 1 次 fill + 1 次 click | ~2s |
| 逐行添加 | 3 次 click + 6 次 fill | ~12s |

> 结论：选项 ≥ 2 个时始终用批量添加。
