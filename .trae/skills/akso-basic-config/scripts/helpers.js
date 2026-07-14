/**
 * Akso eGMP 页面验证/通用辅助脚本
 * 
 * 存放常用的页面验证、等待、数据提取等非业务操作脚本
 */

// ========== 验证操作结果 ==========

/**
 * 验证字段保存成功
 * 判断标准：URL 从 edit/field-base 跳回 edit/fields
 */
async function verifyFieldSaved(page) {
  const url = page.url();
  return url.includes('/edit/fields') ? 'saved' : 'not saved, url=' + url;
}

/**
 * 验证对象保存成功
 * 判断标准：URL 带 ?id= 参数，或跳回对象列表
 */
async function verifyObjectSaved(page) {
  const url = page.url();
  if (url.includes('?id=')) return 'saved (detail page)';
  if (url.includes('/basic-objects/list')) return 'saved (redirected to list)';
  return 'still loading';
}

/**
 * 验证选项集保存成功
 * 判断标准：URL 跳回 pick-list/list
 */
async function verifyOptionSetSaved(page) {
  const url = page.url();
  return url.includes('/pick-list/list') ? 'saved' : 'not saved';
}


// ========== 字段列表快速验证 ==========

/**
 * 获取当前对象的字段列表
 * 返回所有字段名称数组（含系统/标准字段）
 */
async function getFieldList(page) {
  return page.evaluate(() => {
    const cells = document.querySelectorAll('table tbody tr td:first-child');
    return Array.from(cells).map(c => c.textContent.trim());
  });
}


// ========== 等待辅助 ==========

/**
 * 等待保存按钮出现（用于页面 DOM 加载完成检测）
 */
async function waitForSaveButton(page) {
  return page.getByRole('button', { name: 'save 保存' }).waitFor({ timeout: 5000 });
}


// ========== 输入辅助 ==========

/**
 * 安全 fill — 先清空再填入（防止追加到已有内容）
 * 用法：safeFill(page, 'textbox', '请输入名称', '新值')
 */
async function safeFill(page, role, name, value) {
  const el = page.getByRole(role, { name });
  await el.click();
  await el.fill('');
  await el.fill(value);
}

/**
 * Ant Select 安全搜索 — 打开下拉 → 输入关键词 → 回车选择
 */
async function selectFromAntSelect(page, nth, keyword) {
  await page.locator('.ant-select').nth(nth).locator('.ant-select-selector').click();
  await page.keyboard.insertText(keyword);
  await page.keyboard.press('Enter');
}


// ========== 精确搜索点击 ==========

/**
 * 模糊搜索后精确匹配表格行并点击
 * 适用场景：所有 AKSO 列表页的搜索（对象/选项集/编号规则/生命周期等）
 * 参数：keyword(搜索词), exactName(精确匹配名)
 * 返回：true/false
 */
async function searchAndClick(page, keyword, exactName) {
  await page.locator('input[placeholder*="查询"]').fill(keyword);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  const names = await page.evaluate(() => {
    const cells = document.querySelectorAll('table tbody tr td:first-child');
    return Array.from(cells).map(c => c.textContent.trim()).filter(n => n);
  });

  let idx = names.indexOf(exactName);
  if (idx === -1) {
    for (let i = 0; i < names.length; i++) {
      if (names[i].includes(exactName) && !names[i].includes('电子签名')) { idx = i; break; }
    }
  }
  if (idx === -1) return false;

  const links = await page.locator('table tbody tr td:first-child a').all();
  if (links[idx]) { await links[idx].click(); await page.waitForTimeout(2000); return true; }
  return false;
}

module.exports = {
  verifyFieldSaved,
  verifyObjectSaved,
  verifyOptionSetSaved,
  getFieldList,
  waitForSaveButton,
  safeFill,
  selectFromAntSelect,
  searchAndClick
};
