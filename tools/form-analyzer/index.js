const { chromium } = require('playwright');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output');

const TYPE_MAP = {
  1: '文本', 2: '数字', 3: '布尔', 4: '选项',
  5: '日期', 7: '日期时间', 8: '附件',
  9: '自动编号', 10: '外部ID',
  13: '查找', 14: '公式', 15: '对象',
  16: '父对象', 17: '长文本', 18: '富文本',
  19: '对象类型',
  23: '对象多选'
};

async function login(page, config) {
  console.log('[Phase A] 登录中...');
  await page.goto(config.baseUrl + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.getByRole('textbox', { name: '请输入用户名' }).fill(config.username);
  const pwFrame = page.frameLocator('iframe').first();
  await pwFrame.getByRole('textbox', { name: '请输入密码' }).fill(config.password);
  const checkbox = page.getByRole('checkbox', { name: '已阅读并同意' });
  if (!(await checkbox.isChecked())) { await checkbox.click(); }
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '登录' }).click();
  try { await page.waitForURL('**/web**', { timeout: 20000 }); } catch (e) { await page.waitForTimeout(5000); }
  console.log(`[Phase A] 登录完成 (${page.url()})\n`);
  await page.waitForTimeout(1000);
}

async function apiPost(page, apiPath, body) {
  const baseUrl = page.__baseUrl;
  return page.evaluate(async ({ apiPath, body, baseUrl }) => {
    const cookieMatch = document.cookie.match(new RegExp('(^| )__auth_token__=([^;]+)'));
    const token = cookieMatch ? cookieMatch[2] : null;
    const resp = await fetch(baseUrl + apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || '') },
      body: JSON.stringify(body)
    });
    const text = await resp.text();
    try { return JSON.parse(text); } catch (e) {
      return { _parseError: true, status: resp.status, text: text.substring(0, 300) };
    }
  }, { apiPath, body, baseUrl });
}

async function findObject(page, objectName) {
  console.log(`[C-1] 查找对象: "${objectName}"`);
  await page.goto(page.__baseUrl + '/admin/config/basic-objects/list', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);

  const inputs = page.locator('.ant-input-search input, .ant-input-affix-wrapper input, input.ant-input');
  if (await inputs.count() > 0) {
    console.log('  使用搜索框搜索...');
    await inputs.first().click();
    await inputs.first().fill('');
    await page.waitForTimeout(300);
    await inputs.first().fill(objectName);
    await page.waitForTimeout(500);
    await inputs.first().press('Enter');
    await page.waitForTimeout(2000);
  } else {
    console.log('  未找到搜索框，直接翻页...');
  }

  let exactCandidate = null;
  let partialCandidate = null;

  for (let p = 0; p < 10; p++) {
    if (p > 0) {
      const nb = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (await nb.count() === 0) break;
      await nb.first().click(); await page.waitForTimeout(2000);
    }
    const candidates = await page.evaluate((t) => {
      const result = [];
      const rows = document.querySelectorAll('table tbody tr, .ant-table-tbody tr');
      for (const row of rows) {
        const text = (row.textContent||'').trim();
        if (text.includes(t)) {
          const key = row.getAttribute('data-row-key');
          const link = row.querySelector('a');
          let hid = '';
          if (link) { const m = (link.getAttribute('href')||'').match(/[?&]id=([^&]+)/); if (m) hid = m[1]; }
          const cells = row.querySelectorAll('td');
          const firstCellText = cells.length > 0 ? (cells[0].textContent||'').trim() : '';
          result.push({ id: key || hid || '', name: firstCellText || text.split('\n')[0].trim(), totalRows: rows.length });
        }
      }
      return result;
    }, objectName);

    console.log(`  第${p+1}页: ${candidates[0]?.totalRows || 0} 行, 候选 ${candidates.length} 个`);

    for (const c of candidates) {
      if (c.name === objectName) {
        exactCandidate = c;
        break;
      }
      if (!partialCandidate) {
        partialCandidate = c;
      }
    }
    if (exactCandidate) break;
  }

  const final = exactCandidate || partialCandidate;
  if (final) {
    if (exactCandidate) {
      console.log(`  精确匹配: ${final.name} (ID: ${final.id})\n`);
    } else {
      console.log(`  模糊匹配: ${final.name} (ID: ${final.id})\n`);
    }
    return final;
  }
  throw new Error(`未找到对象: "${objectName}"`);
}

async function getFields(page, objectId) {
  console.log(`[C-2] 查询字段列表...`);
  const resp = await apiPost(page, '/api/platform/BasicObject/FieldPage', { objectId, pageIndex: 1, pageSize: 200 });
  if (resp._parseError || resp.code !== 0) throw new Error(`FieldPage 失败: ${JSON.stringify(resp).substring(0, 200)}`);

  const items = resp.data?.datas || resp.data?.items || [];
  if (!Array.isArray(items)) throw new Error(`FieldPage 非预期结构`);

  console.log(`  共 ${items.length} 个字段`);
  const fieldMap = {};
  for (const f of items) {
    fieldMap[f.id] = f;
    const typeName = TYPE_MAP[f.dataType] || `未知(${f.dataType})`;
    console.log(`    ${f.name} | ${typeName} | ${f.code}`);
  }
  console.log();
  return { items, fieldMap };
}

async function discoverAndQueryLayouts(page, objectId) {
  console.log(`[C-3] 查询布局列表...`);
  await page.goto(page.__baseUrl + `/admin/config/basic-objects/edit/fields?id=${objectId}`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  let layoutData = null;

  try {
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/platform/Layout/LayoutList') && r.status() === 200, { timeout: 10000 }).catch(() => null),
      (async () => {
        const tab = page.locator('li').filter({ hasText: /^表单布局$/ }).first();
        if (await tab.count() > 0) { await tab.click(); await page.waitForTimeout(2000); }
      })()
    ]);
    if (resp) { try { layoutData = await resp.json(); } catch (e) {} }
  } catch (e) {}

  if (layoutData && layoutData.code === 0) {
    const items = layoutData.data?.datas || layoutData.data?.items || [];
    if (Array.isArray(items) && items.length > 0) {
      const layouts = items.map(l => ({ id: l.id, name: l.name || '', code: l.code }));
      console.log(`  共 ${layouts.length} 个布局:`);
      for (const l of layouts) console.log(`    - ${l.name}`);
      return { layouts, apiPath: '/api/platform/Layout/LayoutList' };
    }
  }

  console.log('  API 无数据，DOM 降级...');
  const tab = page.locator('li').filter({ hasText: /^表单布局$/ }).first();
  if (await tab.count() > 0) { await tab.click(); await page.waitForTimeout(2000); }

  const layouts = await page.evaluate(() => {
    const result = [];
    for (const row of document.querySelectorAll('table tbody tr, .ant-table-tbody tr')) {
      const key = row.getAttribute('data-row-key');
      const link = row.querySelector('a');
      const cells = row.querySelectorAll('td');
      const name = cells.length > 0 ? (cells[0].textContent||'').trim() : (row.textContent||'').trim();
      if (key || link) result.push({ id: key || '', name: name.split('\n')[0].trim() });
    }
    return result;
  });
  console.log(`  DOM: ${layouts.length} 个布局`);
  return { layouts, apiPath: null };
}

async function getLayoutDetail(page, layoutId, objectId, layoutName) {
  console.log(`[C-4] 布局详情: "${layoutName}"`);
  await page.goto(page.__baseUrl + `/admin/config/basic-objects/edit/fields?id=${objectId}`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  const tab = page.locator('li').filter({ hasText: /^表单布局$/ }).first();
  if (await tab.count() > 0) { await tab.click(); await page.waitForTimeout(2000); }

  try {
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/platform/Layout/LayoutDetail') && r.status() === 200, { timeout: 10000 }).catch(() => null),
      (async () => {
        const rows = page.locator('table tbody tr');
        for (let i = 0; i < await rows.count(); i++) {
          if (await rows.nth(i).getAttribute('data-row-key') === layoutId) {
            const link = rows.nth(i).locator('a').first();
            if (await link.count() > 0) { await link.click(); await page.waitForTimeout(2000); }
            break;
          }
        }
      })()
    ]);
    if (resp) {
      const json = await resp.json();
      if (json.code === 0 && json.data) {
        const d = json.data;
        if (d.sections && d.controls) {
          console.log(`  API: ${d.sections.length} 部分, ${d.controls.length} 控件`);
          return { sections: d.sections || [], controls: d.controls || [] };
        }
      }
    }
  } catch (e) {}

  console.log('  API 无详情，DOM 降级...');
  await page.waitForTimeout(2000);
  const domData = await page.evaluate(() => {
    const sections = [], controls = [];
    const collapseItems = document.querySelectorAll('.ant-collapse-item');
    collapseItems.forEach((item, idx) => {
      const header = item.querySelector('.ant-collapse-header');
      const name = header ? header.textContent.replace(/\s+/g, ' ').trim().substring(0, 40) : `部分${idx+1}`;
      const secId = `s${idx}`; sections.push({ id: secId, name });
      const body = item.querySelector('.ant-collapse-content-box');
      if (body) {
        body.querySelectorAll('.ant-form-item-label label').forEach(l => {
          const t = l.textContent.replace(/[\*\:：\s]+/g, '').trim();
          if (t.length > 1) controls.push({ sectionId: secId, name: t });
        });
      }
    });
    if (sections.length === 0) {
      sections.push({ id: 's0', name: '默认' });
      document.querySelectorAll('.ant-form-item-label label').forEach(l => {
        const t = l.textContent.replace(/[\*\:：\s]+/g, '').trim();
        if (t.length > 1) controls.push({ sectionId: 's0', name: t });
      });
    }
    return { sections, controls };
  });
  console.log(`  DOM: ${domData.sections.length} 部分, ${domData.controls.length} 控件`);
  return domData;
}

function extractRelatedInfo(field) {
  let relatedName = '';
  let remark = '';

  if (field.dataType === 4) {
    const pl = field.picklist;
    if (pl && typeof pl === 'object') {
      relatedName = pl.name || '';
      const opts = pl.options || pl.picklistItems || [];
      if (Array.isArray(opts) && opts.length > 0) {
        remark = opts.map(o => o.name || o.label || '').filter(Boolean).join('、');
      }
    }
  } else if ([15, 16, 23].includes(field.dataType)) {
    const rel = field.objectRelation;
    relatedName = (rel && typeof rel === 'object') ? (rel.objectName || '') : (field.referenceObjectCode || '');
  }

  return { relatedName, remark };
}

function assembleRows(layoutName, sectionMap, controls, sections, fieldMap) {
  const rows = [];
  const usedFields = new Set();

  // 按 section 分组 controls
  const sectionControls = {};
  for (const s of (sections || [])) sectionControls[s.id] = [];
  for (const ctrl of controls) {
    if (!sectionControls[ctrl.sectionId]) sectionControls[ctrl.sectionId] = [];
    sectionControls[ctrl.sectionId].push(ctrl);
  }

  for (const s of (sections || [])) {
    if (s.name === '工作流时间线') continue;

    const partRows = [];

    for (const ctrl of (sectionControls[s.id] || [])) {
      const cleanName = ctrl.name.replace(/[\*\s:：·]/g, '').trim();
      let field = fieldMap[ctrl.fieldId];
      if (!field) {
        for (const [id, f] of Object.entries(fieldMap)) {
          if ((f.name||'').replace(/[\*\s:：·]/g, '').trim() === cleanName) { field = f; break; }
        }
      }
      if (!field) {
        for (const [id, f] of Object.entries(fieldMap)) {
          if ((f.name||'').replace(/[\*\s:：·]/g, '').trim().includes(cleanName)) { field = f; break; }
        }
      }

      const typeName = field ? (TYPE_MAP[field.dataType] || '') : '';
      const { relatedName, remark } = field ? extractRelatedInfo(field) : { relatedName: '', remark: '' };
      if (field) usedFields.add(field.id);

      partRows.push([layoutName, s.name, ctrl.name, typeName, relatedName, remark]);
    }

    if (partRows.length === 0) {
      partRows.push([layoutName, s.name, '', '', '', '']);
    }

    // 同一 part 内字段紧密排列，最后在 part 之间空一行
    rows.push(...partRows, ['', '', '', '', '', '']);
  }

  return { rows, usedFields };
}

function selectLayout(layouts, preferredName) {
  if (layouts.length === 0) return [];
  if (layouts.length === 1) { console.log(`  仅 1 个布局: ${layouts[0].name}\n`); return [layouts[0]]; }

  console.log(`\n  共 ${layouts.length} 个表单布局:`);
  layouts.forEach((l, i) => console.log(`    [${i+1}] ${l.name}`));
  console.log();

  const layoutName = preferredName || process.env.AKSO_LAYOUT_NAME;

  if (layoutName) {
    const match = layouts.find(l => l.name === layoutName);
    if (match) { console.log(`  按名称选择: ${match.name}\n`); return [match]; }
    const partial = layouts.find(l => l.name.includes(layoutName));
    if (partial) { console.log(`  部分匹配选择: ${partial.name}\n`); return [partial]; }
    console.log(`  错误: 未找到名为 "${layoutName}" 的布局`);
    console.log(`  可用布局: ${layouts.map(l => `"${l.name}"`).join(', ')}`);
    throw new Error(`未找到名为 "${layoutName}" 的布局`);
  }

  throw new Error(`该对象有 ${layouts.length} 个布局，请通过 AKSO_LAYOUT_NAME 环境变量或 task 中的 layout 字段指定。可用布局: ${layouts.map(l => `"${l.name}"`).join(', ')}`);
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer.trim()); }));
}

async function resolveEnv() {
  let baseUrl = process.env.AKSO_BASE_URL;
  let username = process.env.AKSO_USERNAME;
  let password = process.env.AKSO_PASSWORD;

  const missing = [];
  if (!baseUrl) missing.push('AKSO_BASE_URL（系统地址）');
  if (!username) missing.push('AKSO_USERNAME（登录用户名）');
  if (!password) missing.push('AKSO_PASSWORD（登录密码）');

  if (missing.length > 0) {
    console.log('以下参数未通过环境变量配置，请交互式输入:');
    console.log('  (' + missing.join(', ') + ')');
    console.log();

    if (!baseUrl) baseUrl = await prompt('系统地址 (如 https://xxx.aksoegmp.com): ');
    if (!username) username = await prompt('登录用户名: ');
    if (!password) password = await prompt('登录密码: ');
    console.log();
  }

  baseUrl = baseUrl.replace(/\/+$/, '');

  return { baseUrl, username, password };
}

function resolveTasks(argv) {
  if (argv.includes('--batch')) {
    const idx = argv.indexOf('--batch');
    const batchFile = argv[idx + 1];
    if (!batchFile) {
      console.log('用法: node tools/form-analyzer/index.js --batch <任务清单.json>');
      console.log('示例: node tools/form-analyzer/index.js --batch tasks.json');
      process.exit(1);
    }

    if (!fs.existsSync(batchFile)) {
      console.log(`错误: 任务文件 "${batchFile}" 不存在`);
      process.exit(1);
    }

    let tasks;
    try {
      tasks = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));
    } catch (e) {
      console.log(`错误: 无法解析 "${batchFile}"，请确保是合法 JSON 文件`);
      process.exit(1);
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.log('错误: 任务清单必须是非空数组');
      process.exit(1);
    }

    for (const t of tasks) {
      if (!t.object || !t.object.trim()) {
        console.log('错误: 每个任务必须包含 "object" 字段');
        process.exit(1);
      }
    }

    return { tasks, isBatch: true };
  }

  const objectName = argv[2];
  if (!objectName || !objectName.trim()) {
    console.log('用法: node tools/form-analyzer/index.js <对象名称>');
    console.log('用法: node tools/form-analyzer/index.js --batch <任务清单.json>');
    console.log();
    console.log('环境变量:');
    console.log('  AKSO_BASE_URL    Akso 系统地址（如 https://xxx.aksoegmp.com）');
    console.log('  AKSO_USERNAME    登录用户名');
    console.log('  AKSO_PASSWORD    登录密码');
    console.log('  AKSO_LAYOUT_NAME 指定表单布局名称（多个布局时推荐）');
    console.log();
    console.log('未设置的环境变量将在运行时交互式询问。');
    process.exit(1);
  }

  const layoutName = process.env.AKSO_LAYOUT_NAME;

  return {
    tasks: [{ object: objectName.trim(), layout: layoutName || undefined }],
    isBatch: false
  };
}

function generateExcel(allRows, sheetName) {
  const headers = ['表单名称', '部分名称', '字段名称', '字段类型', '关联对象/选项集', '备注'];
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...allRows]);
  ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 12 }, { wch: 22 }, { wch: 45 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const fp = path.join(OUTPUT_DIR, `${sheetName}_${ts}.xlsx`);
  XLSX.writeFile(wb, fp);
  return fp;
}

async function runOneTask(page, task) {
  const objectName = task.object;
  const preferredLayout = task.layout;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  任务: ${objectName}${preferredLayout ? ` → ${preferredLayout}` : ''}`);
  console.log(`${'─'.repeat(50)}\n`);

  const { id: objectId, name: foundName } = await findObject(page, objectName);
  const { items: fields, fieldMap } = await getFields(page, objectId);
  const { layouts } = await discoverAndQueryLayouts(page, objectId);
  const selected = selectLayout(layouts, preferredLayout);

  const allRows = [];

  for (const layout of selected) {
    const detail = await getLayoutDetail(page, layout.id, objectId, layout.name);
    const sectionMap = {};
    for (const s of (detail.sections || [])) sectionMap[s.id] = s.name;

    const { rows } = assembleRows(layout.name, sectionMap, detail.controls || [], detail.sections, fieldMap);
    allRows.push(...rows);
  }

  if (allRows.length === 0) {
    console.log('[Phase E] 布局无数据，降级输出全部字段...');
    const layoutName = selected[0]?.name || '(无布局)';
    for (const f of fields) {
      const typeName = TYPE_MAP[f.dataType] || '';
      const ri = extractRelatedInfo(f);
      allRows.push([layoutName, '', f.name, typeName, ri.relatedName, ri.remark]);
    }
  }

  console.log(`\n[Phase D] 生成 Excel...`);
  const sheetName = foundName.replace(/[\\\/\*\?\[\]:]/g, '_').substring(0, 31);
  const fp = generateExcel(allRows, sheetName);

  console.log(`  完成! ${fp}`);
  console.log(`  共 ${allRows.length} 行数据`);

  return { objectName, foundName, fp, rowCount: allRows.length, ok: true };
}

async function main() {
  const { tasks, isBatch } = resolveTasks(process.argv);
  const { baseUrl, username, password } = await resolveEnv();

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.__baseUrl = baseUrl;

  const results = [];

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${isBatch ? `批量任务开始 (${tasks.length} 个)` : `开始: ${tasks[0].object}`}`);
  console.log(`${'═'.repeat(50)}`);

  try {
    await login(page, { baseUrl, username, password });

    for (const task of tasks) {
      try {
        const result = await runOneTask(page, task);
        results.push(result);
      } catch (error) {
        console.log(`\n  [失败] ${task.object}: ${error.message}`);
        results.push({ objectName: task.object, foundName: '', fp: '', rowCount: 0, ok: false, error: error.message });
      }
    }
  } catch (error) {
    console.error(`\n[ERROR] ${error.message}`);
    results.push({ objectName: '(登录)', foundName: '', fp: '', rowCount: 0, ok: false, error: error.message });
  } finally {
    await context.close();
    await browser.close();
  }

  const succeeded = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  批量导出完成`);
  console.log(`  成功: ${succeeded.length}/${results.length}`);
  console.log(`${'═'.repeat(50)}`);

  for (const r of succeeded) {
    console.log(`  ✅ ${r.fp} (${r.rowCount} 行)`);
  }
  for (const r of failed) {
    console.log(`  ❌ ${r.objectName}: ${r.error || '未知错误'}`);
  }
  console.log(`${'═'.repeat(50)}\n`);

  if (failed.length > 0) {
    console.log(`  ⚠  ${failed.length} 个任务失败，详见上方日志`);
  }
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(0);
}

main();
