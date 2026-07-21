/**
 * QRS 报告执行证据链管理模块
 * 在 output/qrs/<报告名>/ 下维护 check.md，作为单一证据源
 */

const fs = require('fs');
const path = require('path');

/**
 * 从大纲路径提取报告名
 * "output/qrs/2025年XX报告/大纲.txt" → "2025年XX报告"
 * "output/qrs/txt/大纲_2025年XX报告.txt" → "2025年XX报告" (兼容旧路径)
 */
function reportName(outlinePath) {
  const absPath = path.resolve(outlinePath);
  const dir = path.dirname(absPath);
  const parentDir = path.basename(dir);

  // 新结构：output/qrs/<报告名>/大纲.txt → 报告名 = 父目录
  if (path.basename(dir) !== 'qrs' && path.basename(dir) !== 'txt' && path.basename(dir) !== 'plan') {
    return parentDir;
  }

  // 旧结构兼容：大纲_<报告名>.txt → 报告名取自文件名
  let base = path.basename(absPath, path.extname(absPath));
  if (base.startsWith('大纲_')) {
    base = base.slice(3);
  }
  return base;
}

/**
 * 返回项目文件夹路径：output/qrs/<报告名>/
 */
function checkDir(outlinePath) {
  const name = reportName(outlinePath);
  const qrsDir = path.resolve(path.join(__dirname, '..', '..', '..', 'output', 'qrs'));
  return path.join(qrsDir, name);
}

function checkPath(outlinePath) {
  return path.join(checkDir(outlinePath), 'check.md');
}

/**
 * 创建 check.md（extract 阶段调用）
 * @param {string} outlinePath — 大纲文件路径
 * @param {object} evidence — 证据戳 { extractedAt, inputPath, chapterCount, reviewIssues }
 * @param {Array<{num: string, title: string}>} chapters — 章节对象数组
 * @returns {string} check 文件路径
 */
function createCheckFile(outlinePath, evidence, chapters) {
  const dir = checkDir(outlinePath);
  fs.mkdirSync(dir, { recursive: true });

  const name = reportName(outlinePath);
  const lines = [`# ${name} — 执行证据`];

  // 顶部证据戳
  if (evidence) {
    lines.push('');
    lines.push('```');
    if (evidence.extractedAt) lines.push(`提取时间: ${evidence.extractedAt}`);
    if (evidence.inputPath) lines.push(`来源文档: ${evidence.inputPath}`);
    if (evidence.chapterCount != null) lines.push(`章节数: ${evidence.chapterCount}`);
    if (evidence.reviewIssues) lines.push(`审查问题: ${evidence.reviewIssues}`);
    lines.push('```');
  }

  // 执行进度
  lines.push('');
  lines.push('## 执行进度');
  lines.push('');
  lines.push('- [ ] 审阅通过');
  lines.push('- [ ] 创建章节');

  // 章节设计清单
  lines.push('');
  lines.push('## 章节设计清单');
  lines.push('');
  for (const ch of chapters) {
    lines.push(`- [ ] Ch${ch.num} ${ch.title}`);
  }
  lines.push('');

  const fp = checkPath(outlinePath);
  fs.writeFileSync(fp, lines.join('\n'), 'utf-8');
  return fp;
}

/**
 * 通用：勾选 check.md 中指定标签的复选框
 * @param {string} outlinePath
 * @param {string} label — "审阅通过" / "创建章节" / "ChN"
 */
function markCheckItem(outlinePath, label) {
  const fp = checkPath(outlinePath);
  if (!fs.existsSync(fp)) {
    throw new Error(`check 文件不存在: ${fp}`);
  }

  const content = fs.readFileSync(fp, 'utf-8');
  const lines = content.split('\n');

  // 构建匹配模式：行首 "- [ ] " 后跟 label（允许 label 后跟空格及更多文本）
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^(\\- \\[ \\]) ${escaped}(\\s|$)`);

  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      lines[i] = lines[i].replace('- [ ] ', '- [x] ');
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error(`check.md 中未找到未勾选项: ${label}`);
  }

  fs.writeFileSync(fp, lines.join('\n'), 'utf-8');
}

/**
 * 读取 check.md 中指定标签的复选框状态
 * @param {string} outlinePath
 * @param {string} label
 * @returns {boolean} true=已勾选，false=未勾选或不匹配
 */
function isCheckItemChecked(outlinePath, label) {
  const fp = checkPath(outlinePath);
  if (!fs.existsSync(fp)) return false;

  const content = fs.readFileSync(fp, 'utf-8');
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = content.match(new RegExp(`^\\- \\[x\\] ${escaped}$`, 'm'));
  return !!m;
}

/**
 * 将指定章节标记为已完成（markCheckItem 的别名）
 * @param {string} outlinePath
 * @param {string|number} chapterNum
 */
function markChapterDone(outlinePath, chapterNum) {
  return markCheckItem(outlinePath, `Ch${chapterNum}`);
}

/**
 * 读取清单中尚未完成的章节编号
 * @param {string} outlinePath
 * @returns {string[]|null} 未完成章节编号数组，清单不存在时返回 null
 */
function readChecklist(outlinePath) {
  const fp = checkPath(outlinePath);
  if (!fs.existsSync(fp)) return null;

  const content = fs.readFileSync(fp, 'utf-8');
  const lines = content.split('\n');
  const pending = [];

  for (const line of lines) {
    const m = line.match(/^\- \[ \] Ch(\d+)\s/);
    if (m) {
      pending.push(m[1]);
    }
  }

  return pending;
}

/**
 * 校验现有清单与当前大纲是否一致
 * @param {string} outlinePath
 * @param {Array<{num: string, title: string}>} currentChapters
 * @returns {{ valid: string[], orphaned: Array<{num:string, checked:boolean}>, new: Array<{num:string, title:string}> }}
 */
function validateChecklist(outlinePath, currentChapters) {
  const fp = checkPath(outlinePath);
  const currentNumSet = new Set(currentChapters.map(c => String(c.num)));

  const done = [];
  const orphaned = [];

  if (fs.existsSync(fp)) {
    const content = fs.readFileSync(fp, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^- \[(.)\] Ch(\d+)\s/);
      if (!m) continue;
      const checked = m[1] === 'x';
      const num = m[2];
      if (currentNumSet.has(num)) {
        if (checked) done.push(num);
      } else {
        orphaned.push({ num, checked });
      }
    }
  }

  const newChapters = currentChapters.filter(c => !done.includes(String(c.num)));
  return { valid: done, orphaned, new: newChapters };
}

/**
 * 清理清单中的无效条目，保留有效已完成章节
 */
function rebuildChecklist(outlinePath, validDoneNums, currentChapters) {
  const dir = checkDir(outlinePath);
  fs.mkdirSync(dir, { recursive: true });

  // 保留原文件中的证据戳和执行进度区，仅重写章节清单部分
  let headerLines = [];
  if (fs.existsSync(checkPath(outlinePath))) {
    const old = fs.readFileSync(checkPath(outlinePath), 'utf-8').split('\n');
    let inChapterSection = false;
    for (const line of old) {
      if (line.startsWith('## 章节设计清单')) {
        inChapterSection = true;
        continue;
      }
      if (inChapterSection && line.startsWith('## ')) {
        inChapterSection = false;
        headerLines.push(line);
        continue;
      }
      if (!inChapterSection) {
        headerLines.push(line);
      }
    }
  }

  const doneSet = new Set(validDoneNums.map(String));
  const chLines = [];
  for (const ch of currentChapters) {
    if (doneSet.has(String(ch.num))) {
      chLines.push(`- [x] Ch${ch.num} ${ch.title}`);
    } else {
      chLines.push(`- [ ] Ch${ch.num} ${ch.title}`);
    }
  }

  // 如果原文件无结构，则重新构建
  if (headerLines.length === 0) {
    const name = reportName(outlinePath);
    headerLines = [`# ${name} — 执行证据`, '', '## 执行进度', '', '- [ ] 审阅通过', '- [ ] 创建章节'];
  }

  // 去掉末尾空行，追加章节清单
  while (headerLines.length > 0 && headerLines[headerLines.length - 1] === '') {
    headerLines.pop();
  }
  headerLines.push('');
  headerLines.push('## 章节设计清单');
  headerLines.push('');
  headerLines.push(...chLines);
  headerLines.push('');

  const fp = checkPath(outlinePath);
  fs.writeFileSync(fp, headerLines.join('\n'), 'utf-8');
  return fp;
}

module.exports = {
  reportName,
  checkDir,
  checkPath,
  createCheckFile,
  markCheckItem,
  isCheckItemChecked,
  markChapterDone,
  readChecklist,
  validateChecklist,
  rebuildChecklist
};
