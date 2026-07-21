/**
 * Akso eGMP 创建字段原子模块 — v2.2
 * 
 * 用法（单个字段 — 模块调用）：
 *   const { createField } = require('./create-field.js');
 *   const result = await createField(page, { name, code, dataType, objectName, ... });
 * 
 * 用法（批量字段 — 模块调用）：
 *   const { createFieldsBatch } = require('./create-field.js');
 *   // 同对象：
 *   const results = await createFieldsBatch(page, [{ name, code, dataType, objectName, ... }, ...]);
 *   // 跨对象自动分组，同一对象只进入一次字段页
 * 
 * 用法（独立运行 — 单个）：
 *   node create-field.js --name 字段名 --code field_code --dataType 1 --objectName 对象名
 * 
 * 用法（独立运行 — 批量，JSON 文件）：
 *   node create-field.js --batchFile fields.json
 *   // fields.json 中每项需含 objectName
 * 
 * 用法（独立运行 — 批量，JSON 字符串）：
 *   node create-field.js --batch '[{"name":"A","code":"a","dataType":1,"objectName":"X"},...]'
 * 
 * dataType: 1=文本,2=数字,3=布尔,4=选项,5=日期,7=日期时间,15=对象,17=长文本
 * 
 * 返回（单个）：{ success, message }
 * 返回（批量）：[{ name, code, dataType, objectName, success, message }, ...]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const { launchBrowser, login, closeBrowser, dismissAllPopups } = require('../../shared/browser-manager');

const TYPE_NAMES = { 1: '文本', 2: '数字', 3: '布尔', 4: '选项', 5: '日期', 7: '日期时间', 15: '对象', 17: '长文本' };

async function selectFromCombobox(page, comboboxSelector, exactName, excludePattern) {
  await comboboxSelector.click();
  await page.waitForTimeout(500);
  await page.keyboard.insertText(exactName);
  await page.waitForTimeout(1000);

  const dropdownSelectors = [
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
    '.ant-modal-wrap .ant-select-dropdown:not(.ant-select-dropdown-hidden)',
    '.ant-modal .ant-select-dropdown:not(.ant-select-dropdown-hidden)',
    '.ant-select-dropdown',
  ];

  let dropdown = null;
  for (const sel of dropdownSelectors) {
    const d = page.locator(sel).last();
    if (await d.isVisible({ timeout: 1000 }).catch(() => false)) {
      const items = await d.locator('.ant-select-item-option-content').all();
      if (items.length > 0) {
        dropdown = d;
        break;
      }
    }
  }

  if (!dropdown) {
    console.warn(`  [选择] 下拉未出现: "${exactName}"，回退 Enter`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    return;
  }

  const items = await dropdown.locator('.ant-select-item-option-content').all();
  if (items.length === 0) {
    console.warn(`  [选择] 下拉无匹配项: "${exactName}"，回退 Enter`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    return;
  }

  let exactIdx = -1;
  for (let i = 0; i < items.length; i++) {
    const text = (await items[i].textContent() || '').trim();
    if (text === exactName && (!excludePattern || !text.includes(excludePattern))) {
      exactIdx = i;
      break;
    }
  }

  if (exactIdx === -1) {
    for (let i = 0; i < items.length; i++) {
      const text = (await items[i].textContent() || '').trim();
      if (text.includes(exactName) && (!excludePattern || !text.includes(excludePattern))) {
        exactIdx = i;
        break;
      }
    }
  }

  if (exactIdx >= 0) {
    await items[exactIdx].click();
    await page.waitForTimeout(500);
  } else {
    const allTexts = [];
    for (let i = 0; i < Math.min(items.length, 10); i++) {
      allTexts.push((await items[i].textContent() || '').trim());
    }
    console.warn(`  [选择] 未找到精确匹配 "${exactName}"，前10项: ${JSON.stringify(allTexts)}，回退 Enter`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
}

async function enterObjectFieldPage(page, objectName, baseUrl) {
  const bu = baseUrl || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com';

  await page.goto(bu + '/admin/config/basic-objects/list', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.locator('input[placeholder*="查询"]').fill(objectName);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  const allNames = await page.evaluate(() => {
    const cells = document.querySelectorAll('table tbody tr td:first-child');
    return Array.from(cells).map(c => c.textContent.trim()).filter(n => n);
  });
  let exactIdx = -1;
  for (let i = 0; i < allNames.length; i++) { if (allNames[i] === objectName) { exactIdx = i; break; } }
  if (exactIdx === -1) {
    for (let i = 0; i < allNames.length; i++) {
      if (allNames[i].includes(objectName) && !allNames[i].includes('电子签名')) { exactIdx = i; break; }
    }
  }
  if (exactIdx === -1) return { success: false, message: `对象[${objectName}]未找到，搜索结果：${JSON.stringify(allNames)}` };

  const links = await page.locator('table tbody tr td:first-child a').all();
  if (!links[exactIdx]) return { success: false, message: `行[${exactIdx}]没有可点击的链接` };
  await links[exactIdx].click();
  await page.waitForTimeout(3000);

  const fieldTab = page.locator('li').filter({ hasText: /^字段$/ }).first();
  await fieldTab.click();
  await page.waitForTimeout(2000);

  return { success: true };
}

async function createOneField(page, opts = {}) {
  const name = opts.name;
  const code = opts.code;
  const dataType = parseInt(opts.dataType || '1');
  const required = opts.required === true || opts.required === 'true';
  const picklistName = opts.picklist;
  const refObjectName = opts.refObject;

  if (!name || !code) {
    return { success: false, message: 'Missing name/code' };
  }

  const targetType = TYPE_NAMES[dataType];
  if (!targetType) return { success: false, message: `Unknown dataType: ${dataType}` };

  try {
    await page.getByRole('button', { name: '创 建' }).click();
    await page.waitForTimeout(1500);

    if (dataType !== 1) {
      await page.locator('.ant-select').first().locator('.ant-select-selector').click();
      await page.waitForTimeout(500);
      const dropdown = page.locator('.ant-select-dropdown');
      if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dropdown.getByText(targetType, { exact: true }).click();
      } else {
        await page.getByText(targetType, { exact: true }).click();
      }
      await page.waitForTimeout(800);
    }

    await page.getByPlaceholder('请输入名称').fill(name);
    await page.getByRole('textbox', { name: '请输入Code' }).fill(code);
    await page.waitForTimeout(300);

    if (required) {
      const cb = page.getByRole('checkbox', { name: '必填' });
      if (await cb.isVisible({ timeout: 500 }).catch(() => false)) await cb.click();
    }

    if (dataType === 4 && picklistName) {
      await selectFromCombobox(
        page,
        page.locator('.ant-select').nth(2).locator('.ant-select-selector'),
        picklistName
      );
    }

    if (dataType === 15 && refObjectName) {
      await selectFromCombobox(
        page,
        page.locator('.ant-select').nth(2).locator('.ant-select-selector'),
        refObjectName,
        '电子签名'
      );
    }

    await page.getByRole('button', { name: 'save 保存' }).click();
    await page.waitForTimeout(2500);

    await dismissAllPopups(page);

    const saved = page.url().includes('/edit/fields');
    return { success: saved, message: saved ? `字段[${name}]创建成功` : '保存后未跳回字段列表' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function createField(page, opts = {}) {
  const objectName = opts.objectName;
  if (!objectName) return { success: false, message: 'Missing objectName' };

  const enterResult = await enterObjectFieldPage(page, objectName, opts.baseUrl);
  if (!enterResult.success) return enterResult;

  return createOneField(page, opts);
}

async function createFieldsBatch(page, fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return [];
  }

  const groups = new Map();
  for (const f of fields) {
    const obj = f.objectName || '(default)';
    if (!groups.has(obj)) groups.set(obj, []);
    groups.get(obj).push(f);
  }

  const objectNames = [...groups.keys()];
  const totalFields = fields.length;
  console.log(`批量创建 ${totalFields} 个字段，涉及 ${objectNames.length} 个对象`);

  const results = [];
  let currentObject = null;

  for (const [objectName, objFields] of groups) {
    if (currentObject !== objectName) {
      console.log(`  进入对象 [${objectName}] 的字段页...`);
      const enterResult = await enterObjectFieldPage(page, objectName);
      if (!enterResult.success) {
        for (const f of objFields) {
          const msg = `无法进入对象[${objectName}]: ${enterResult.message}`;
          console.error(`  [跳过] 字段[${f.name}]: ${msg}`);
          results.push({ name: f.name, code: f.code, dataType: f.dataType || 1, objectName, success: false, message: msg });
        }
        continue;
      }
      currentObject = objectName;
    }

    for (const f of objFields) {
      const result = await createOneField(page, {
        name: f.name,
        code: f.code,
        dataType: f.dataType || 1,
        required: f.required || false,
        picklist: f.picklist,
        refObject: f.refObject
      });
      results.push({
        name: f.name,
        code: f.code,
        dataType: f.dataType || 1,
        objectName,
        success: result.success,
        message: result.message
      });
      if (!result.success) {
        console.error(`  [跳过] 字段[${f.name}]: ${result.message}`);
      }
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };
  const hasFlag = (name) => args.includes(name);

  const batchJson = getArg('--batch');
  const batchFile = getArg('--batchFile');

  if (batchJson || batchFile) {
    let fields;
    if (batchFile) {
      if (!fs.existsSync(batchFile)) { console.error(`文件不存在: ${batchFile}`); process.exit(1); }
      try { fields = JSON.parse(fs.readFileSync(batchFile, 'utf-8')); } catch (e) { console.error(`JSON 解析失败: ${e.message}`); process.exit(1); }
    } else {
      try { fields = JSON.parse(batchJson); } catch (e) { console.error(`JSON 解析失败: ${e.message}`); process.exit(1); }
    }
    if (!Array.isArray(fields) || fields.length === 0) { console.error('批量模式: 字段列表必须是非空数组'); process.exit(1); }

    const { browser, page } = await launchBrowser({ headless: false });
    await login(page);
    const results = await createFieldsBatch(page, fields);
    await closeBrowser(browser);

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    console.log(`\n完成: ${succeeded.length}/${results.length} 成功`);
    for (const r of succeeded) console.log(`  ✅ [${r.objectName}][${r.name}] ${r.message}`);
    if (failed.length > 0) {
      for (const r of failed) console.log(`  ❌ [${r.objectName}][${r.name}] ${r.message}`);
    }
    return;
  }

  const name = getArg('--name');
  const code = getArg('--code');
  const dataType = getArg('--dataType') || '1';
  const objectName = getArg('--objectName');
  const required = hasFlag('--required');
  const picklist = getArg('--picklist');
  const refObject = getArg('--refObject');

  if (!name || !code || !objectName) {
    console.error('用法: node create-field.js --name 字段名 --code field_code --dataType 1 --objectName 对象名');
    console.error('批量: node create-field.js --batchFile fields.json');
    console.error('批量: node create-field.js --batch \'[{...}]\'');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser({ headless: false });
  await login(page);
  const result = await createField(page, { name, code, dataType, objectName, required, picklist, refObject });
  console.log(result.message);
  await closeBrowser(browser);
}

module.exports = { createField, createOneField, createFieldsBatch, enterObjectFieldPage, selectFromCombobox, main };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
