# 示例：完整创建对象（含生命周期 + 电子签名）

> 对应 Skill 指令：第四章
> 前置：已登录并进入配置端

## 操作步骤

### Step 1：直接导航到对象列表

```
mcp__playwright__browser_navigate → https://standard-val.aksoegmp.com/admin/config/basic-objects/list
```

### Step 2：进入创建页面

```js
// browser_run_code_unsafe
() => page.getByRole('button', { name: '创 建' }).click()
```

### Step 3：填写基础信息（browser_run_code_unsafe）

```js
() => {
  // 对象名称
  page.getByRole('textbox', { name: '请输入此字段' }).fill('测试对象A');
  // Code
  page.getByRole('textbox', { name: '请输入Code' }).fill('test_obj_a');
}
```

### Step 4：勾选生命周期和电子签名（browser_run_code_unsafe）

```js
() => {
  // 生命周期（关键：保存后不可修改）
  page.getByRole('checkbox', { name: '生命周期' }).click();
  // 电子签名
  page.getByRole('checkbox', { name: '启用电子签名' }).click();
}
```

### Step 5：保存并等待生命周期创建

```js
// 点击保存
() => page.getByRole('button', { name: 'save 保存' }).click()
```

> ⚠️ 勾选生命周期后，保存会触发服务端创建生命周期元数据，需要 **等待 10s**。

```js
// 等待 10s 后验证结果
() => {
  // 检查当前 URL
  const url = page.url();
  if (url.includes('/admin/config/basic-objects/list')) return 'saved (redirected to list)';
  if (url.includes('?id=')) return 'saved (stayed on detail)';
  return 'still loading, wait more';
}
```

### Step 6：回到对象详情进入字段页

```js
// 搜索刚创建的对象并点击进入
() => page.getByRole('link', { name: '测试对象A', exact: true }).click()
```

## 完整示例时间线

| 步骤 | 操作 | 耗时 |
|------|------|------|
| 1 | navigate | ~2s |
| 2 | click 创建 | ~1s |
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
