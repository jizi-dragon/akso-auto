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
() => {
  const url = page.url();
  return url.includes('/edit/fields') ? 'saved' : 'not saved, url=' + url;
}

/**
 * 验证对象保存成功
 * 判断标准：URL 带 ?id= 参数，或跳回对象列表
 */
() => {
  const url = page.url();
  if (url.includes('?id=')) return 'saved (detail page)';
  if (url.includes('/basic-objects/list')) return 'saved (redirected to list)';
  return 'still loading';
}

/**
 * 验证选项集保存成功
 * 判断标准：URL 跳回 pick-list/list
 */
() => {
  const url = page.url();
  return url.includes('/pick-list/list') ? 'saved' : 'not saved';
}


// ========== 字段列表快速验证 ==========

/**
 * 获取当前对象的字段列表
 * 返回所有字段名称数组（含系统/标准字段）
 */
() => {
  const rows = page.locator('table tbody tr');
  const texts = [];
  // 使用 evaluate 获取所有行第一列的文本
  return page.evaluate(() => {
    const cells = document.querySelectorAll('table tbody tr td:first-child');
    return Array.from(cells).map(c => c.textContent.trim());
  });
}

/**
 * 统计字段总数（含系统/标准字段）
 */
() => {
  const text = page.locator('text=/当前第\\d+页 共(\\d+)条/').textContent();
  return text;
}


// ========== 等待辅助 ==========

/**
 * 等待按钮不再处于 loading 状态
 */
() => {
  const btn = page.getByRole('button', { name: /保存/ });
  return btn.waitFor({ state: 'detached' }); // loading 消失
}

/**
 * 等待保存按钮出现（用于页面 DOM 加载完成检测）
 */
() => page.getByRole('button', { name: 'save 保存' }).waitFor({ timeout: 5000 })


// ========== 输入辅助 ==========

/**
 * 安全 fill — 先清空再填入（防止追加到已有内容）
 * 用法：safeFill(page, locator, '新值')
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
