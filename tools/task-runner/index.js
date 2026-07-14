/**
 * Akso eGMP 任务编排器 — v2.0
 * 
 * 在一个浏览器会话中按序执行多个原子模块，避免反复启动/关闭浏览器。
 * 遇到错误时自动分类、修复或记录，任务全部完成后再关闭浏览器并输出报告。
 * 
 * 用法：
 *   node tools/task-runner/index.js --file tasks.json
 *   node tools/task-runner/index.js --json '[...]'
 * 
 * 任务描述格式（tasks.json）：
 * [
 *   {
 *     "module": "create-option-set",
 *     "params": { "name": "测试风险等级", "code": "option_test_risk", "options": "高,high;中,mid" }
 *   },
 *   {
 *     "module": "create-fields",
 *     "params": [
 *       { "name": "...", "code": "...", "dataType": 4, "objectName": "...", "picklist": "..." }
 *     ]
 *   }
 * ]
 * 
 * 支持的 module 名称：
 *   create-option-set → createOptionSet(page, params)
 *   create-fields      → createFieldsBatch(page, params)  // params 直接是数组
 *   create-object      → createObject(page, params)
 *   exact-search-click → exactSearchClick(page, params)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { login, closeBrowser } = require('../../shared/browser-manager');

const SCRIPTS_DIR = path.join(__dirname, '..', '..', '.trae', 'skills', 'akso-basic-config', 'scripts');

const MODULE_MAP = {
  'create-option-set': () => require(path.join(SCRIPTS_DIR, 'create-option-set.js')).createOptionSet,
  'create-fields': () => require(path.join(SCRIPTS_DIR, 'create-field.js')).createFieldsBatch,
  'create-object': () => require(path.join(SCRIPTS_DIR, 'create-object.js')).createObject,
  'exact-search-click': () => require(path.join(SCRIPTS_DIR, 'exact-search-click.js')).exactSearchClick,
};

function classifyError(message) {
  const m = (message || '').toLowerCase();
  if (m.includes('名称重复') || m.includes('code重复') || m.includes('保存后未跳回')) return 'NAME_DUPLICATE';
  if (m.includes('未找到') || m.includes('不存在')) return 'NOT_FOUND';
  if (m.includes('timeout') || m.includes('超时') || m.includes('navigation')) return 'NETWORK';
  if (m.includes('unknown datatype')) return 'BAD_PARAM';
  return 'UNKNOWN';
}

const RECOVERY_MSG_MAP = {
  'create-option-set': (p) => `选项集名称 [${p.name}] 可能重复`,
  'create-object': (p) => `对象名称 [${p.name}] 可能重复`,
};

async function tryRecover(page, task, originalError) {
  const moduleName = task.module;
  const params = task.params;
  const errorType = classifyError(originalError.message || originalError);

  if (errorType === 'BAD_PARAM' || errorType === 'NETWORK') {
    return { recovered: false, action: 'skip', message: `无法自动修复(${errorType}): ${originalError.message || originalError}` };
  }

  if (errorType === 'NOT_FOUND') {
    return { recovered: false, action: 'skip', message: `目标不存在: ${originalError.message || originalError}` };
  }

  if (errorType === 'NAME_DUPLICATE' && params && params.name) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const suffix = `_v${attempt}`;
      const newParams = { ...params, name: params.name + suffix };
      const oldCode = params.code;
      if (oldCode) newParams.code = oldCode + '_v' + attempt;

      console.log(`  [修复] 重试: ${newParams.name} (第 ${attempt} 次)`);

      const loader = MODULE_MAP[moduleName];
      const fn = loader();
      try {
        const result = await fn(page, newParams);
        if (result.success !== false) {
          params.name = newParams.name;
          params.code = newParams.code;
          return { recovered: true, action: 'retry_ok', newName: newParams.name, message: `自动改名重试成功: ${newParams.name}` };
        }
      } catch (e) {}
    }
    return { recovered: false, action: 'skip', message: `名称重复且自动修复失败(已重试3次): ${params.name}` };
  }

  return { recovered: false, action: 'skip', message: originalError.message || originalError };
}

async function recoverBatchFields(page, failedFields) {
  const recovered = [];
  const stillFailed = [];

  for (const f of failedFields) {
    const errorType = classifyError(f.message);
    if (errorType === 'NAME_DUPLICATE' && f.name) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const suffix = `_v${attempt}`;
        const newName = f.name + suffix;
        const newCode = (f.code || '') + '_v' + attempt;
        console.log(`  [修复字段] 重试: ${newName} (第 ${attempt} 次)`);

        const { createOneField } = require(path.join(SCRIPTS_DIR, 'create-field.js'));
        const result = await createOneField(page, {
          name: newName, code: newCode, dataType: f.dataType || 1,
          required: f.required || false, picklist: f.picklist, refObject: f.refObject
        });
        if (result.success) {
          recovered.push({ ...f, name: newName, code: newCode, originalName: f.name, message: `自动改名重试成功: ${newName}` });
          break;
        }
        if (attempt === 3) {
          stillFailed.push({ ...f, message: `名称重复且自动修复失败(已重试3次)` });
        }
      }
    } else {
      stillFailed.push(f);
    }
  }

  return { recovered, stillFailed };
}

async function runTask(page, task) {
  const moduleName = task.module;
  const loader = MODULE_MAP[moduleName];
  if (!loader) {
    return { module: moduleName, success: false, messages: [`未知模块: ${moduleName}`] };
  }

  const fn = loader();
  console.log(`\n[执行] ${moduleName}`);

  const reports = [];

  try {
    const result = await fn(page, task.params);

    if (Array.isArray(result)) {
      const succeeded = result.filter(r => r.success);
      const failed = result.filter(r => !r.success);

      for (const r of succeeded) reports.push({ level: 'ok', item: `[${r.objectName || ''}][${r.name}]`, msg: r.message });
      for (const r of failed) reports.push({ level: 'fail', item: `[${r.objectName || ''}][${r.name}]`, msg: r.message, raw: r });

      if (failed.length > 0) {
        const { recovered, stillFailed } = await recoverBatchFields(page, failed);
        for (const r of recovered) reports.push({ level: 'recovered', item: `[${r.objectName || ''}][${r.name}]`, msg: r.message });
        for (const r of stillFailed) reports.push({ level: 'fail', item: `[${r.objectName || ''}][${r.name}]`, msg: r.message });

        const finalOk = succeeded.length + recovered.length;
        const finalFailed = stillFailed.length;

        for (const r of reports) {
          const icon = r.level === 'ok' ? '✅' : r.level === 'recovered' ? '🔧' : '❌';
          console.log(`  ${icon} ${r.item} ${r.msg}`);
        }
        console.log(`  -> ${finalOk}/${result.length} 成功` + (recovered.length > 0 ? ` (${recovered.length} 个自动修复)` : ''));

        return { module: moduleName, success: finalFailed === 0, messages: reports.map(r => r.msg) };
      }

      for (const r of reports) console.log(`  ✅ ${r.item} ${r.msg}`);
      console.log(`  -> ${succeeded.length}/${result.length} 成功`);
      return { module: moduleName, success: true, messages: reports.map(r => r.msg) };
    }

    const ok = result.success !== false;
    if (ok) {
      console.log(`  -> 成功: ${result.message || ''}`);
      reports.push({ level: 'ok', item: '', msg: result.message || '' });
      return { module: moduleName, success: true, messages: reports.map(r => r.msg) };
    }

    console.log(`  -> 失败: ${result.message || ''}`);
    const recovery = await tryRecover(page, task, result);
    if (recovery.recovered) {
      console.log(`  🔧 自动修复成功: ${recovery.message}`);
      task.params = { ...task.params, name: recovery.newName, code: recovery.newCode };
      reports.push({ level: 'recovered', item: recovery.newName || '', msg: recovery.message });
      return { module: moduleName, success: true, messages: reports.map(r => r.msg) };
    }

    console.log(`  ❌ ${recovery.message}`);
    reports.push({ level: 'fail', item: task.params?.name || '', msg: recovery.message });
    return { module: moduleName, success: false, messages: reports.map(r => r.msg) };

  } catch (e) {
    console.error(`  -> 异常: ${e.message}`);
    const recovery = await tryRecover(page, task, { message: e.message });
    if (recovery.recovered) {
      console.log(`  🔧 自动修复成功: ${recovery.message}`);
      reports.push({ level: 'recovered', item: recovery.newName || '', msg: recovery.message });
      return { module: moduleName, success: true, messages: reports.map(r => r.msg) };
    }
    console.log(`  ❌ ${recovery.message}`);
    reports.push({ level: 'fail', item: task.params?.name || '', msg: recovery.message });
    return { module: moduleName, success: false, messages: reports.map(r => r.msg) };
  }
}

function printReport(allResults) {
  const succeeded = allResults.filter(r => r.success);
  const failed = allResults.filter(r => !r.success);

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  任务执行报告`);
  console.log(`${'═'.repeat(55)}`);
  console.log(`  总计: ${allResults.length} 个模块`);
  console.log(`  成功: ${succeeded.length}`);
  console.log(`  失败: ${failed.length}`);
  console.log(`${'═'.repeat(55)}`);

  if (succeeded.length > 0) {
    console.log(`\n  成功模块:`);
    for (const r of succeeded) {
      console.log(`    ✅ [${r.module}]`);
    }
  }
  if (failed.length > 0) {
    console.log(`\n  失败模块:`);
    for (const r of failed) {
      console.log(`    ❌ [${r.module}] ${(r.messages || []).join('; ')}`);
    }
  }
  console.log(`${'═'.repeat(55)}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const filePath = getArg('--file');
  const jsonStr = getArg('--json');

  let tasks;
  if (filePath) {
    if (!fs.existsSync(filePath)) { console.error(`文件不存在: ${filePath}`); process.exit(1); }
    try { tasks = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (e) { console.error(`JSON 解析失败: ${e.message}`); process.exit(1); }
  } else if (jsonStr) {
    try { tasks = JSON.parse(jsonStr); } catch (e) { console.error(`JSON 解析失败: ${e.message}`); process.exit(1); }
  } else {
    console.error('用法: node tools/task-runner/index.js --file tasks.json');
    console.error('      node tools/task-runner/index.js --json \'[{...}]\'');
    process.exit(1);
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    console.error('任务列表必须是非空数组');
    process.exit(1);
  }

  console.log(`${'═'.repeat(55)}`);
  console.log(`  任务编排器 v2.0 — ${tasks.length} 个模块`);
  console.log(`${'═'.repeat(55)}`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let browserAlive = true;
  const allResults = [];

  try {
    console.log(`\n[登录] 启动浏览器...`);
    await login(page);
    console.log(`[登录] 完成\n`);

    for (const task of tasks) {
      const result = await runTask(page, task);
      allResults.push(result);
    }
  } catch (e) {
    console.error(`\n  💥 编排器异常: ${e.message}`);
    console.error(`  ⚠ 浏览器保持开启，未关闭`);
    allResults.push({ module: '(编排器)', success: false, messages: [e.message] });
    browserAlive = false;
  }

  try {
    await closeBrowser(browser);
    console.log(`\n浏览器已关闭`);
  } catch (e) {
    console.error(`关闭浏览器时出错: ${e.message}`);
  }

  printReport(allResults);
  process.exit(allResults.some(r => !r.success) ? 1 : 0);
}

module.exports = { runTask, MODULE_MAP, classifyError };

if (require.main === module) {
  main().catch((e) => {
    console.error(`💥 致命异常: ${e.message}`);
    process.exit(1);
  });
}
