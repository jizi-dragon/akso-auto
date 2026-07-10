# 示例：一发入魂登录

> 对应 Skill 指令：`1.2.6`
> 目标：用最少 MCP 调用（2 次）完成登录

## 前置条件

- 已知环境 URL、用户名、密码
- 浏览器已打开（Playwright MCP 已连接）

## 操作步骤

### Step 1：导航到登录页

```
mcp__playwright__browser_navigate → https://standard-val.aksoegmp.com/login
```

### Step 2：一发入魂登录（browser_run_code_unsafe）

```js
// 复制到 browser_run_code_unsafe 的 code 参数
() => {
  page.getByRole('textbox', { name: '请输入用户名' }).fill('liyulong');
  page.frameLocator('iframe').first().getByRole('textbox', { name: '请输入密码' }).fill('88888888');
  page.getByRole('button', { name: '登录' }).click();
}
```

### Step 3：等待跳转到业务首页

```js
// 可选：确认登录成功
() => page.waitForURL('**/web', { timeout: 10000 })
```

## 预期结果

- 页面 URL 从 `/login` 跳转到 `/web`
- 页面标题显示 `Akso eGMP (配置)`
- 右上角显示当前用户名称

## 耗时对比

| 方式 | MCP 调用次数 | 耗时 |
|------|:----------:|------|
| 旧方式（逐步） | 4 次 | ~15s |
| 一发入魂 | 2 次 | ~4s |

## 环境切换

不同环境只需修改 URL 和账号密码：

```js
() => {
  page.getByRole('textbox', { name: '请输入用户名' }).fill('替换为用户名');
  page.frameLocator('iframe').first().getByRole('textbox', { name: '请输入密码' }).fill('替换为密码');
  page.getByRole('button', { name: '登录' }).click();
}
```
