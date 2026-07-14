# 示例：完整创建对象（含生命周期 + 电子签名）

> 对应 Skill 指令：第四章
> 前置：已登录并进入配置端

---

## 方式一：脚本命令（推荐）

```bash
node scripts/create-object.js --name "测试对象A" --code "test_obj_a" --lifecycle --esign
```

参数说明：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--name` | 对象名称 | 必填 |
| `--code` | 对象 Code（自动追加 `__c`） | 必填 |
| `--lifecycle` | 勾选生命周期 | 不勾选 |
| `--esign` | 勾选电子签名 | 不勾选 |
| `--baseUrl` | 系统地址 | 环境变量 `AKSO_BASE_URL` |

### 脚本实现参考

`scripts/create-object.js` 核心逻辑：

```js
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../shared/browser-manager');

async function createObject(page, opts) {
  await page.goto(page.__baseUrl + '/admin/config/basic-objects/list', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: '创 建' }).click();
  await page.waitForTimeout(1500);

  await page.getByRole('textbox', { name: '请输入此字段' }).fill(opts.name);
  await page.getByRole('textbox', { name: '请输入Code' }).fill(opts.code);

  if (opts.lifecycle) {
    await page.getByRole('checkbox', { name: '生命周期' }).click();
  }
  if (opts.esign) {
    await page.getByRole('checkbox', { name: '启用电子签名' }).click();
  }

  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'save 保存' }).click();

  if (opts.lifecycle) {
    console.log('等待生命周期元数据创建（10s）...');
    await page.waitForTimeout(10000);
  } else {
    await page.waitForTimeout(3000);
  }

  const url = page.url();
  const saved = url.includes('/admin/config/basic-objects/list') || url.includes('?id=');
  console.log(saved ? '创建成功' : '仍在加载中，请检查');
  return { success: saved, url };
}

async function main() {
  const args = parseArgs();
  const { browser, page } = await launchBrowser();
  page.__baseUrl = args.baseUrl;

  await login(page, args);
  await dismissAllPopups(page);

  const result = await createObject(page, {
    name: args.name,
    code: args.code,
    lifecycle: args.lifecycle,
    esign: args.esign
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
const { launchBrowser, login, closeBrowser } = require('../shared/browser-manager');

async function createMyObject() {
  const { browser, page } = await launchBrowser();
  page.__baseUrl = 'https://standard-val.aksoegmp.com';

  await login(page, {
    baseUrl: page.__baseUrl,
    username: 'liyulong',
    password: '88888888'
  });

  // Step 1: 导航到对象列表
  await page.goto(page.__baseUrl + '/admin/config/basic-objects/list', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Step 2: 点击创建
  await page.getByRole('button', { name: '创 建' }).click();
  await page.waitForTimeout(1500);

  // Step 3: 填写基础信息
  await page.getByRole('textbox', { name: '请输入此字段' }).fill('测试对象A');
  await page.getByRole('textbox', { name: '请输入Code' }).fill('test_obj_a');

  // Step 4: 勾选生命周期和电子签名
  await page.getByRole('checkbox', { name: '生命周期' }).click();
  await page.getByRole('checkbox', { name: '启用电子签名' }).click();

  // Step 5: 保存并等待生命周期创建
  await page.getByRole('button', { name: 'save 保存' }).click();

  // ⚠️ 勾选生命周期后需等待 10s
  console.log('等待生命周期元数据创建...');
  await page.waitForTimeout(10000);

  // Step 6: 验证
  const url = page.url();
  if (url.includes('/admin/config/basic-objects/list')) {
    console.log('保存成功（重定向到列表）');
  } else if (url.includes('?id=')) {
    console.log('保存成功（停留在详情）');
    // 点击"字段"标签页继续操作
    const fieldTab = page.locator('li').filter({ hasText: /^字段$/ }).first();
    if (await fieldTab.count() > 0) {
      await fieldTab.click();
      console.log('已进入字段管理页');
    }
  } else {
    console.log('仍在加载，请手动检查');
  }

  await closeBrowser(browser);
}

createMyObject();
```

---

## 操作步骤详解

### Step 1：直接导航到对象列表

```js
await page.goto(baseUrl + '/admin/config/basic-objects/list', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
```

### Step 2：进入创建页面

```js
await page.getByRole('button', { name: '创 建' }).click();
await page.waitForTimeout(1500);
```

### Step 3：填写基础信息

```js
await page.getByRole('textbox', { name: '请输入此字段' }).fill('测试对象A');
await page.getByRole('textbox', { name: '请输入Code' }).fill('test_obj_a');
```

### Step 4：勾选生命周期和电子签名

```js
await page.getByRole('checkbox', { name: '生命周期' }).click();
await page.getByRole('checkbox', { name: '启用电子签名' }).click();
```

> ⚠️ **关键约束**：生命周期勾选后，保存时会触发服务端创建生命周期元数据。此选项保存后不可修改，必须一次性决定。

### Step 5：保存并等待生命周期创建

```js
await page.getByRole('button', { name: 'save 保存' }).click();

// 勾选生命周期时必须等待
if (hasLifecycle) {
  await page.waitForTimeout(10000);
} else {
  await page.waitForTimeout(3000);
}
```

### Step 6：验证

```js
const url = page.url();
if (url.includes('/admin/config/basic-objects/list')) {
  console.log('保存成功（重定向到列表）');
} else if (url.includes('?id=')) {
  console.log('保存成功（停留在详情页）');
} else {
  console.log('保存中或失败，请检查页面状态');
}
```

---

## 完整时间线

| 步骤 | 操作 | 耗时 |
|------|------|------|
| 1 | goto 对象列表 | ~2s |
| 2 | click 创建 | ~1.5s |
| 3 | fill 名称/Code | ~1s |
| 4 | click 生命周期+电子签名 | ~1s |
| 5 | click 保存 | ~1s |
| 5b | wait 生命周期创建 | ~10s |
| **合计** | | **~16s** |

## 验证清单

- [ ] 对象列表中出现新对象
- [ ] Code 后缀为 `__c`
- [ ] 生命周期列显示对象名 + "生命周期"
- [ ] 电子签名子对象自动创建（`xxx_esignature__sys`）
- [ ] 状态为"启用"
