/**
 * Akso eGMP 登录 — 一发入魂版
 * 
 * 用法：将此代码复制到 browser_run_code_unsafe 的 code 参数
 * 执行前：先 navigate 到登录页 URL
 * 
 * 修改下面的 USERNAME / PASSWORD 为实际值即可
 */

// ========== 修改这里 ==========
const USERNAME = 'liyulong';
const PASSWORD = '88888888';
// =============================

// 填写用户名
page.getByRole('textbox', { name: '请输入用户名' }).fill(USERNAME);

// 填写密码（穿透 iframe）
page.frameLocator('iframe').first()
  .getByRole('textbox', { name: '请输入密码' })
  .fill(PASSWORD);

// 点击登录
page.getByRole('button', { name: '登录' }).click();
