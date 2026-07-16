/**
 * QRS 回顾报告创建工具 — index.js
 *
 * 两步审批流程：
 *   1. extract — 从 .docx 提取大纲 → 生成完整大纲.txt → 标记"待审批"
 *   2. approve — 用户审查通过后标记"已审批"
 *   3. create  — 在系统中批量创建章节目录（须已审批）
 *   4. design  — 逐章在 ONLYOFFICE 编辑器中写入内容（须已审批）
 *
 * 用法：
 *   node tools/qrs-report-creator/index.js extract --input template.docx --output 大纲.txt
 *   node tools/qrs-report-creator/index.js approve --outline 大纲.txt
 *   node tools/qrs-report-creator/index.js status  --outline 大纲.txt
 *   node tools/qrs-report-creator/index.js create  --outline 大纲.txt --reportUrl <URL>
 *   node tools/qrs-report-creator/index.js design  --outline 大纲.txt --chapters 1,2,3 --reportUrl <URL>
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
const { parseOutline, createChapters, designChapter } = require('./lib/chapter-automation');
const { createState, approve, readState, requireApproval, markReviewed } = require('./lib/state-manager');
const { extractOutline } = require('./lib/extract-outline');
const { reviewQuality, formatReviewReport } = require('./lib/review-outline');

const EXTRACT_SCRIPT = path.join(__dirname, 'lib', 'extract-outline.py');

function getConfig(args) {
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };
  return {
    baseUrl: getArg('--baseUrl') || process.env.AKSO_BASE_URL || 'https://standard-val.aksoegmp.com',
    username: getArg('--username') || process.env.AKSO_USERNAME,
    password: getArg('--password') || process.env.AKSO_PASSWORD,
    input: getArg('--input'),
    output: getArg('--output'),
    outline: getArg('--outline'),
    reportUrl: getArg('--reportUrl'),
    chapters: getArg('--chapters'),
    chapter: getArg('--chapter')
  };
}

function checkDocxOnly(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext !== '.docx') {
    console.error(`仅支持 .docx 格式。当前文件为 ${ext || '无扩展名'}，请先用 Word 另存为 .docx 格式后重试。`);
    process.exit(1);
  }
}

async function doExtract(config) {
  if (!config.input) { console.error('缺少 --input <docx路径>'); process.exit(1); }

  checkDocxOnly(config.input);
  if (!fs.existsSync(config.input)) { console.error(`文件不存在: ${config.input}`); process.exit(1); }

  // 输出文件名默认关联源文档名
  if (!config.output) {
    const base = path.basename(config.input, '.docx');
    config.output = path.join(path.dirname(config.input), '大纲_' + base + '.txt');
  }

  console.log(`[提取] 输入: ${config.input}`);
  console.log(`[提取] 输出: ${config.output}`);

  // 优先使用 Node.js 提取器，失败时回退到 Python
  let success = false;
  try {
    extractOutline(config.input, config.output);
    console.log(`[提取] Node.js 提取器完成`);
    success = true;
  } catch (jsErr) {
    console.log(`[提取] Node.js 提取器失败: ${jsErr.message}，尝试 Python...`);
    await new Promise((resolve, reject) => {
      const proc = spawn('python', [EXTRACT_SCRIPT, '--input', config.input, '--output', config.output], {
        stdio: 'inherit'
      });
      proc.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error(`Python 脚本退出码: ${code}`));
      });
      proc.on('error', (err) => reject(new Error(`无法启动 Python: ${err.message}`)));
    });
    success = true;
  }

  if (!success) throw new Error('提取失败');

  let chapterCount = 0;
  try {
    const { toc } = parseOutline(config.output);
    chapterCount = toc.length;
  } catch {}

  // 自动执行审查
  let reviewIssues = 0;
  try {
    const fullText = fs.readFileSync(config.output, 'utf-8');
    const review = reviewQuality(fullText);
    reviewIssues = review.summary?.totalIssues || 0;
    if (reviewIssues > 0) {
      console.log('\n' + formatReviewReport(review));
    } else {
      console.log('\n[审查] ✅ 未检测到结构问题');
    }
  } catch (e) {
    console.log('\n[审查] 跳过: ' + e.message);
  }

  createState(config.output, { inputPath: config.input, chapterCount, reviewed: true, reviewIssues });

  console.log(`\n[提取] 完成 → ${config.output}`);
  console.log(`[提取] 章节数: ${chapterCount}`);
  if (reviewIssues > 0) console.log(`⚠ 审查发现问题 ${reviewIssues} 处，请检查上述报告后修订大纲`);
  console.log(`\n========================================`);
  console.log(`  请审查 "${path.basename(config.output)}"，确认无误后执行:`);
  console.log(`  node tools/qrs-report-creator/index.js approve --outline "${config.output}"`);
  console.log(`========================================`);
}

async function doCreate(config, page) {
  const outlinePath = config.outline || config.output;
  if (!outlinePath) { console.error('缺少 --outline <大纲文件路径>'); process.exit(1); }

  requireApproval(outlinePath, 'create');

  console.log(`[创建] 解析大纲: ${outlinePath}`);
  const { toc } = parseOutline(outlinePath);
  console.log(`[创建] 待创建 ${toc.length} 个章节: ${toc.map(c => c.name).join(', ')}`);

  await createChapters(page, toc);
  console.log(`[创建] 完成`);
}

async function doDesign(config, page) {
  const outlinePath = config.outline || config.output;
  if (!outlinePath) { console.error('缺少 --outline <大纲文件路径>'); process.exit(1); }

  requireApproval(outlinePath, 'design');

  const { chapters } = parseOutline(outlinePath);
  console.log(`[设计] 大纲共 ${chapters.length} 章`);

  let targetChapters;
  if (config.chapters) {
    const nums = config.chapters.split(',').map(Number).filter(n => !isNaN(n));
    targetChapters = chapters.filter(c => nums.includes(c.num));
  } else if (config.chapter) {
    const n = Number(config.chapter);
    targetChapters = chapters.filter(c => c.num === n);
  } else {
    targetChapters = chapters;
  }

  console.log(`[设计] 待设计 ${targetChapters.length} 章`);

  for (let i = 0; i < targetChapters.length; i++) {
    const ch = targetChapters[i];
    const nthIndex = ch.num - 1;
    console.log(`\n[设计] Ch${ch.num} "${ch.title}" (${i + 1}/${targetChapters.length})`);
    try {
      await designChapter(page, nthIndex, ch.lines);
      console.log(`  ✅ Ch${ch.num} 完成`);
    } catch (e) {
      console.error(`  ❌ Ch${ch.num} 失败: ${e.message}`);
    }
  }
  console.log(`\n[设计] 完成`);
}

function printUsage() {
  console.log(`
QRS 回顾报告创建工具 — 两步审批流程

流程:
  1. extract  从 .docx 提取文档大纲（生成完整大纲.txt + 自动审查）
  2. review   二次审查大纲结构质量问题
  3. approve  审查大纲后标记审批通过
  4. create   在系统中批量创建章节（须已审批）
  5. design   逐章设计内容，写入 ONLYOFFICE 编辑器（须已审批）

命令:
  extract   从 .docx 提取文档大纲（含自动审查）
  review    审查大纲结构质量
  approve   标记大纲已审批
  status    查看当前审批状态
  create    在系统中批量创建章节目录
  design    逐章设计内容

通用参数:
  --baseUrl   系统地址（默认 AKSO_BASE_URL 或 https://standard-val.aksoegmp.com）
  --username  用户名（默认 AKSO_USERNAME）
  --password  密码（默认 AKSO_PASSWORD）

extract 参数:
  --input     .docx 模板文件路径（仅支持 .docx）
  --output    输出大纲文件路径（可选，默认 大纲_<文档名>.txt）

approve 参数:
  --outline   大纲文件路径

status 参数:
  --outline   大纲文件路径

create 参数:
  --outline   大纲文件路径
  --reportUrl 报告模板编辑页 URL

design 参数:
  --outline   大纲文件路径
  --chapters  要设计的章节编号，逗号分隔（如 1,2,3，不指定则全部）
  --chapter   单个章节编号
  --reportUrl 报告模板编辑页 URL

示例:
  node tools/qrs-report-creator/index.js extract --input report.docx --output 大纲.txt
  node tools/qrs-report-creator/index.js approve --outline 大纲.txt
  node tools/qrs-report-creator/index.js status  --outline 大纲.txt
  node tools/qrs-report-creator/index.js create  --outline 大纲.txt --reportUrl https://xxx.aksoegmp.com/web/...
  node tools/qrs-report-creator/index.js design  --outline 大纲.txt --chapters 1,2,3 --reportUrl https://xxx.aksoegmp.com/web/...
`);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printUsage();
    process.exit(0);
  }

  const config = getConfig(args);

  // ---- 不需要浏览器的命令 ----
  if (cmd === 'extract') {
    await doExtract(config);
    return;
  }

  if (cmd === 'review') {
    const outlinePath = config.outline || config.output;
    if (!outlinePath) { console.error('缺少 --outline <大纲文件路径>'); process.exit(1); }
    if (!fs.existsSync(outlinePath)) { console.error(`大纲文件不存在: ${outlinePath}`); process.exit(1); }

    const fullText = fs.readFileSync(outlinePath, 'utf-8');
    const review = reviewQuality(fullText);
    console.log(formatReviewReport(review));
    if (review.summary?.totalIssues > 0) {
      console.log(`\n💡 发现 ${review.summary.totalIssues} 个问题，建议修正后再审批。`);
    }
    return;
  }

  if (cmd === 'approve') {
    const outlinePath = config.outline || config.output;
    if (!outlinePath) { console.error('缺少 --outline <大纲文件路径>'); process.exit(1); }
    if (!fs.existsSync(outlinePath)) { console.error(`大纲文件不存在: ${outlinePath}`); process.exit(1); }

    const state = approve(outlinePath);
    if (!state) { console.error('未找到审批状态文件，请先执行 extract'); process.exit(1); }
    console.log(`✅ 审批通过`);
    console.log(`   大纲: ${path.basename(outlinePath)}`);
    console.log(`   章节数: ${state.chapterCount}`);
    console.log(`   审批时间: ${state.approvedAt}`);
    console.log(`\n   可执行 create / design`);
    return;
  }

  if (cmd === 'status') {
    const outlinePath = config.outline || config.output;
    if (!outlinePath) { console.error('缺少 --outline <大纲文件路径>'); process.exit(1); }

    const state = readState(outlinePath);
    if (!state) {
      console.log('状态: 尚未执行 extract（无审批状态文件）');
      process.exit(0);
    }
    console.log(`状态:`);
    console.log(`  大纲已生成: 是`);
    console.log(`  大纲文件:   ${path.basename(state.outlinePath)}`);
    console.log(`  来源文档:   ${state.inputPath || '(未知)'}`);
    console.log(`  提取时间:   ${state.extractedAt}`);
    console.log(`  章节数:     ${state.chapterCount}`);
    console.log(`  已审批:     ${state.approved ? '✅ 是' : '❌ 否'}`);
    if (state.approved) console.log(`  审批时间:   ${state.approvedAt}`);
    if (!state.approved) console.log(`\n  ⚠ 尚未审批，请审查大纲后执行: node ... approve --outline "${outlinePath}"`);
    return;
  }

  // ---- 需要浏览器的命令 ----
  const needsBrowser = ['create', 'design'].includes(cmd);
  if (!needsBrowser) {
    console.error(`未知命令: ${cmd}`);
    printUsage();
    process.exit(1);
  }

  if (!config.username || !config.password) {
    console.error('请通过 --username/--password 或环境变量 AKSO_USERNAME/AKSO_PASSWORD 提供登录凭证');
    process.exit(1);
  }

  const { browser, page } = await launchBrowser();

  try {
    console.log(`[登录] ${config.baseUrl}`);
    const loginResult = await login(page, {
      baseUrl: config.baseUrl,
      username: config.username,
      password: config.password
    });
    if (!loginResult.success) {
      console.error('[登录] 失败，请检查凭证');
      process.exit(1);
    }
    console.log('[登录] 成功');

    if (cmd === 'create') {
      if (!config.reportUrl) { console.error('缺少 --reportUrl'); process.exit(1); }
      await page.goto(config.reportUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await doCreate(config, page);
    } else if (cmd === 'design') {
      if (!config.reportUrl) { console.error('缺少 --reportUrl'); process.exit(1); }
      await page.goto(config.reportUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await doDesign(config, page);
    }
  } catch (e) {
    console.error(`\n[错误] ${e.message}`);
    process.exit(1);
  } finally {
    await closeBrowser(browser);
    console.log('\n浏览器已关闭');
  }
}

module.exports = { doExtract, doCreate, doDesign };

if (require.main === module) {
  main().catch((e) => {
    console.error(`致命错误: ${e.message}`);
    process.exit(1);
  });
}
