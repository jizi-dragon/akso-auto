# 示例：批量创建所有字段类型

> 对应 Skill 指令：第五章
> 前置：对象已创建，已在对象详情页 → 字段标签页

## 字段类型对照表

| # | 中文类型 | 类型 title | Code 示例 | 特殊操作 |
|---|----------|-----------|-----------|----------|
| 1 | 文本 | `文本` | `text_field` | 无 |
| 2 | 长文本 | `长文本` | `long_text_field` | 无 |
| 3 | 数字 | `数字` | `number_field` | 无 |
| 4 | 布尔 | `布尔` | `boolean_field` | 无 |
| 5 | 选项 | `选项` | `option_field` | 绑定选项集 |
| 6 | 对象 | `对象` (exact) | `obj_field` | 绑定关联对象 |
| 7 | 父对象 | `父对象` (exact) | `parent_field` | ⚠️ 特殊定位 |
| 8 | 附件 | `附件` | `attachment_field` | 无 |

## 通用模板：创建一个字段

每个字段遵循相同的三步模式：

### ❶ 点击创建 + 选择类型（合并）

```js
// browser_run_code_unsafe — 替换 SELECTOR 为类型对应的选择器
() => {
  page.getByRole('button', { name: '创 建' }).click();
  page.locator('.ant-select').first().locator('.ant-select-selector').click();
  // ★ 替换这里
  page.getByTitle('类型名').first().click();
}
```

### ❷ 填写名称和 Code（合并）

```js
// browser_run_code_unsafe — 替换 NAME 和 CODE
() => {
  page.getByRole('textbox', { name: '请输入此字段' }).fill('NAME');
  page.getByRole('textbox', { name: '请输入Code' }).fill('CODE');
}
```

### ❸ 绑定/设置 + 保存

```js
// 选项字段 — 绑定选项集
() => {
  page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();
  page.keyboard.insertText('选项集名称');
  page.keyboard.press('Enter');
  page.getByRole('button', { name: 'save 保存' }).click();
}

// 对象字段 — 绑定关联对象
() => {
  page.locator('.ant-select').nth(2).locator('.ant-select-selector').click();
  page.keyboard.insertText('关联对象名');
  page.keyboard.press('Enter');
  page.getByRole('button', { name: 'save 保存' }).click();
}

// 普通字段 — 直接保存
() => page.getByRole('button', { name: 'save 保存' }).click()
```

## 父对象字段特殊处理

> ⚠️ `.ant-select:nth(2)` 对父对象无效，会误输入到 Code 框

```js
// 父对象字段 — 必须按以下三步走
// Step A: 创建 + 选类型
() => {
  page.getByRole('button', { name: '创 建' }).click();
  page.locator('.ant-select').first().locator('.ant-select-selector').click();
  page.locator('.ant-select-item-option-content').filter({ hasText: /^父对象$/ }).click();
}

// Step B: 填写名称和 Code
() => {
  page.getByRole('textbox', { name: '请输入此字段' }).fill('父对象字段');
  page.getByRole('textbox', { name: '请输入Code' }).fill('parent_field');
}

// Step C: 先 snapshot 获取 *对象 combobox 的 ref，然后用 ref click
// 或用表单标签定位（需要先确认 DOM 结构）
// 示例（成功后保存）：
() => page.getByRole('button', { name: 'save 保存' }).click()
```

## 完整流程示例（6 个普通字段 + 选项 + 父对象）

预计 MCP 调用数：`8 字段 × 3 调用 + 1 次父对象额外 snapshot ≈ 27 调用`

| 步骤 | 字段 | MCP 调用 | 说明 |
|------|------|:------:|------|
| 1 | 文本 | 2 | 点击+选类型 合并 | fill+save 合并 |
| 2 | 长文本 | 2 | 同上 |
| 3 | 数字 | 2 | 同上 |
| 4 | 布尔 | 2 | 同上 |
| 5 | 选项 | 3 | +绑定选项集 |
| 6 | 对象 | 3 | +绑定关联对象 |
| 7 | 父对象 | 4 | +snapshot (特殊) +绑定 |
| 8 | 附件 | 2 | 同上 |
| **合计** | **8 字段** | **20** | |
