# 示例：批量创建所有字段类型

> 对应 Skill 指令：第五章
> 前置：对象已创建，已定位到该对象详情页 → 字段标签页

---

## 方式一：脚本命令（推荐）

```bash
node lib/create-field.js --objectName "测试对象A" --name "文本字段" --code "text_field" --dataType "文本"
```

支持批量 JSON 文件传入：

```bash
node lib/create-field.js --batch fields-batch.json --objectName "测试对象A"
```

`fields-batch.json` 格式：

```json
[
  { "name": "文本字段", "code": "text_field", "dataType": "文本" },
  { "name": "长文本字段", "code": "long_text_field", "dataType": "长文本" },
  { "name": "数字字段", "code": "number_field", "dataType": "数字" },
  { "name": "布尔字段", "code": "boolean_field", "dataType": "布尔" },
  { "name": "选项字段", "code": "option_field", "dataType": "选项", "refName": "优先级" },
  { "name": "对象字段", "code": "obj_field", "dataType": "对象", "refName": "关联对象名" },
  { "name": "父对象字段", "code": "parent_field", "dataType": "父对象" },
  { "name": "附件字段", "code": "attachment_field", "dataType": "附件" }
]
```

参数说明：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--name` | 字段名称 | 必填 |
| `--code` | 字段 Code | 必填 |
| `--dataType` | 字段类型（中文名称，见下表） | 必填 |
| `--objectName` | 所属对象名称 | 必填 |
| `--refName` | 关联对象名或选项集名（选项/对象类型必填） | 无 |
| `--batch` | 批量 JSON 文件路径 | 无 |
| `--baseUrl` | 系统地址 | 环境变量 `AKSO_BASE_URL` |

---

## 字段类型对照表

| # | 中文类型 | dataType 参数值 | Code 示例 | 特殊操作 |
|---|----------|----------------|-----------|----------|
| 1 | 文本 | `文本` | `text_field` | 无 |
| 2 | 长文本 | `长文本` | `long_text_field` | 无 |
| 3 | 数字 | `数字` | `number_field` | 无 |
| 4 | 布尔 | `布尔` | `boolean_field` | 无 |
| 5 | 选项 | `选项` | `option_field` | 绑定选项集 |
| 6 | 对象 | `对象` | `obj_field` | 绑定关联对象 |
| 7 | 父对象 | `父对象` | `parent_field` | ⚠️ 特殊定位 |
| 8 | 附件 | `附件` | `attachment_field` | 无 |

---

## 脚本实现参考

`lib/create-field.js` 核心逻辑：

```js
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../../shared/browser-manager');

const TYPE_SELECTOR_MAP = {
  '文本': '文本',
  '长文本': '长文本',
  '数字': '数字',
  '布尔': '布尔',
  '选项': '选项',
  '对象': '对象',
  '父对象': '父对象',
  '附件': '附件'
};

async function navigateToObjectFields(page, objectName) {
  await page.goto(page.__baseUrl + '/admin/config/basic-objects/list', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const searchInput = page.locator('input.ant-input').first();
  await searchInput.click();
  await searchInput.fill(objectName);
  await searchInput.press('Enter');
  await page.waitForTimeout(2000);

  await page.getByRole('link', { name: objectName, exact: true }).click();
  await page.waitForTimeout(2000);

  const fieldTab = page.locator('li').filter({ hasText: /^字段$/ }).first();
  if (await fieldTab.count() > 0) {
    await fieldTab.click();
    await page.waitForTimeout(1500);
  }
}

async function createField(page, opts) {
  // Step A: 点击创建 + 选择类型
  await page.getByRole('button', { name: '创 建' }).click();
  await page.waitForTimeout(800);

  await page.locator('.ant-select').first().locator('.ant-select-selector').click();
  await page.waitForTimeout(500);

  const typeTitle = TYPE_SELECTOR_MAP[opts.dataType];
  await page.getByTitle(typeTitle).first().click();
  await page.waitForTimeout(500);

  // Step B: 填写名称和 Code
  await page.getByRole('textbox', { name: '请输入此字段' }).fill(opts.name);
  await page.getByRole('textbox', { name: '请输入Code' }).fill(opts.code);
  await page.waitForTimeout(300);

  // Step C: 特殊类型绑定
  if (opts.dataType === '选项' && opts.refName) {
    await page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();
    await page.keyboard.insertText(opts.refName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
  if (opts.dataType === '对象' && opts.refName) {
    await page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();
    await page.keyboard.insertText(opts.refName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
  if (opts.dataType === '父对象') {
    // 父对象的关联对象选择器使用不同定位方式
    await page.waitForTimeout(500);
    // 需要用 snapshot 辅助定位，或用表单标签定位
  }

  // Step D: 保存
  await page.getByRole('button', { name: 'save 保存' }).click();
  await page.waitForTimeout(2000);

  console.log(`字段 "${opts.name}" 创建完成`);
}
```

---

## 方式二：require 模块模式

```js
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../shared/browser-manager');

async function createAllFieldTypes() {
  const { browser, page } = await launchBrowser();
  page.__baseUrl = 'https://standard-val.aksoegmp.com';

  await login(page, {
    baseUrl: page.__baseUrl,
    username: 'liyulong',
    password: '88888888'
  });
  await dismissAllPopups(page);

  // 导航到对象字段页
  await page.goto(page.__baseUrl + '/admin/config/basic-objects/list', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const input = page.locator('input.ant-input').first();
  await input.click();
  await input.fill('测试对象A');
  await input.press('Enter');
  await page.waitForTimeout(2000);

  await page.getByRole('link', { name: '测试对象A', exact: true }).click();
  await page.waitForTimeout(2000);

  const fieldTab = page.locator('li').filter({ hasText: /^字段$/ }).first();
  if (await fieldTab.count() > 0) {
    await fieldTab.click();
    await page.waitForTimeout(1500);
  }

  const fields = [
    { name: '文本字段', code: 'text_field', type: '文本' },
    { name: '长文本字段', code: 'long_text_field', type: '长文本' },
    { name: '数字字段', code: 'number_field', type: '数字' },
    { name: '布尔字段', code: 'boolean_field', type: '布尔' },
    { name: '选项字段', code: 'option_field', type: '选项', refName: '优先级' },
    { name: '对象字段', code: 'obj_field', type: '对象', refName: '关联对象名' },
    { name: '父对象字段', code: 'parent_field', type: '父对象' },
    { name: '附件字段', code: 'attachment_field', type: '附件' }
  ];

  for (const field of fields) {
    console.log(`创建字段: ${field.name} (${field.type})`);

    // 点击创建 + 选择类型
    await page.getByRole('button', { name: '创 建' }).click();
    await page.waitForTimeout(800);

    await page.locator('.ant-select').first().locator('.ant-select-selector').click();
    await page.waitForTimeout(500);
    await page.getByTitle(field.type).first().click();
    await page.waitForTimeout(500);

    // 填写名称和 Code
    await page.getByRole('textbox', { name: '请输入此字段' }).fill(field.name);
    await page.getByRole('textbox', { name: '请输入Code' }).fill(field.code);
    await page.waitForTimeout(300);

    // 绑定关联
    if (field.refName && (field.type === '选项' || field.type === '对象')) {
      await page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();
      await page.keyboard.insertText(field.refName);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // 保存
    await page.getByRole('button', { name: 'save 保存' }).click();
    await page.waitForTimeout(2000);
  }

  console.log('所有字段创建完毕');
  await closeBrowser(browser);
}

createAllFieldTypes();
```

---

## 通用模板：创建一个字段（三步模式）

每个字段遵循相同的三步模式：

### ❶ 点击创建 + 选择类型

```js
await page.getByRole('button', { name: '创 建' }).click();
await page.waitForTimeout(800);

await page.locator('.ant-select').first().locator('.ant-select-selector').click();
await page.waitForTimeout(500);

// ★ 替换 TYPE_TITLE 为类型中文名
await page.getByTitle('文本').first().click();
await page.waitForTimeout(500);
```

### ❷ 填写名称和 Code

```js
await page.getByRole('textbox', { name: '请输入此字段' }).fill('字段名称');
await page.getByRole('textbox', { name: '请输入Code' }).fill('field_code');
```

### ❸ 绑定/设置 + 保存

```js
// 选项字段 — 绑定选项集
await page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();
await page.keyboard.insertText('优先级');
await page.keyboard.press('Enter');
await page.getByRole('button', { name: 'save 保存' }).click();

// 对象字段 — 绑定关联对象
await page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();
await page.keyboard.insertText('关联对象名');
await page.keyboard.press('Enter');
await page.getByRole('button', { name: 'save 保存' }).click();

// 普通字段 — 直接保存
await page.getByRole('button', { name: 'save 保存' }).click();
```

---

## 父对象字段特殊处理

> ⚠️ `.ant-select:nth(2)` 对父对象无效，会误输入到 Code 框。需使用精确文本匹配。

```js
// Step A: 创建 + 选类型（父对象需要用 filter 精确匹配）
await page.getByRole('button', { name: '创 建' }).click();
await page.waitForTimeout(800);

await page.locator('.ant-select').first().locator('.ant-select-selector').click();
await page.waitForTimeout(500);

await page.locator('.ant-select-item-option-content').filter({ hasText: /^父对象$/ }).click();
await page.waitForTimeout(500);

// Step B: 填写名称和 Code
await page.getByRole('textbox', { name: '请输入此字段' }).fill('父对象字段');
await page.getByRole('textbox', { name: '请输入Code' }).fill('parent_field');

// Step C: 绑定关联对象
// 父对象的关联对象选择器需要用表单标签定位或 snapshot 获取 ref
// 确认绑定完成后保存：
await page.getByRole('button', { name: 'save 保存' }).click();
```

---

## 完整流程示例（8 个字段）

| 步骤 | 字段 | 操作说明 |
|------|------|------|
| 1 | 文本 | 点击创建 → 选类型 → fill name/code → 保存 |
| 2 | 长文本 | 同上 |
| 3 | 数字 | 同上 |
| 4 | 布尔 | 同上 |
| 5 | 选项 | 同上 + 绑定选项集 |
| 6 | 对象 | 同上 + 绑定关联对象 |
| 7 | 父对象 | 同上 + 特殊定位绑定 |
| 8 | 附件 | 同普通字段 |
