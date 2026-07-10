# 示例：批量创建选项集

> 对应 Skill 指令：第三章
> 前置：已登录并进入配置端

## 操作步骤

### Step 1：导航到选项集列表

```
mcp__playwright__browser_navigate → https://standard-val.aksoegmp.com/admin/config/pick-list/list
```

### Step 2：点击创建

```js
// browser_run_code_unsafe
() => page.getByRole('button', { name: '创 建' }).click()
```

### Step 3：填写名称和 Code（合并）

```js
() => {
  page.getByRole('textbox', { name: '请输入此字段' }).fill('优先级');
  page.getByRole('textbox', { name: '请输入Code' }).fill('option_priority');
}
```

### Step 4：批量添加选项值

```js
// 点击"批量添加"按钮
() => page.getByRole('button', { name: /批量添加/ }).click()
```

> 弹出批量添加对话框后，粘贴以下格式的选项值（每行一个：显示值,存储值）

```js
// 在批量添加对话框的文本区域填写
() => {
  const text = `高,high
中,medium
低,low`;
  page.locator('.ant-modal textarea').fill(text);
  page.getByRole('button', { name: '确 定' }).click();
}
```

### Step 5：保存

```js
() => page.getByRole('button', { name: 'save 保存' }).click()
```

### Step 6：验证

```js
// 确认保存成功（URL 跳回列表页）
() => {
  const url = page.url();
  if (url.includes('/admin/config/pick-list/list')) return 'saved';
  return 'still on edit page';
}
```

## 备选：逐行添加（仅 1 个选项时使用）

```js
// 点击"添加选项"
() => page.getByRole('button', { name: /添加选项/ }).click()

// 填写第一行
() => {
  // 第 2 个 textbox = 名称
  page.getByRole('textbox').nth(2).fill('高');
  // 第 3 个 textbox = Code
  page.getByRole('textbox').nth(3).fill('high');
}
```

## 批量添加 vs 逐行添加对照

| 方式 | 3 个选项的 MCP 调用 | 耗时 |
|------|:---:|------|
| 批量添加 | 1 次 | ~2s |
| 逐行添加 | 6 次 (3×click+fill+fill) | ~12s |

> 结论：选项 ≥ 2 个时始终用批量添加。
