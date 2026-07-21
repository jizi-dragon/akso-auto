/**
 * 章节设计清单管理模块
 * 在 output/qrs/plan/ 下维护 Markdown 格式的章节完成清单
 */

const fs = require('fs');
const path = require('path');

/**
 * 根据 outlinePath 推导 plan 目录
 * outlinePath 可能在 output/qrs/txt/ 或 output/qrs/ 下
 * 统一取 output/qrs/ 目录再拼接 plan/
 */
function planDir(outlinePath) {
  const absPath = path.resolve(outlinePath);
  let dir = path.dirname(absPath);
  // 如果在 txt/ 子目录下，上翻一级到 qrs/
  if (path.basename(dir).toLowerCase() === 'txt') {
    dir = path.dirname(dir);
  }
  return path.join(dir, 'plan');
}

/**
 * 从大纲文件名提取报告名
 * 例如："大纲_2025年一车间工艺用气年度质量回顾报告.txt" → "2025年一车间工艺用气年度质量回顾报告"
 */
function reportName(outlinePath) {
  let base = path.basename(outlinePath, path.extname(outlinePath));
  if (base.startsWith('大纲_')) {
    base = base.slice(3);
  }
  return base;
}

function checklistPath(outlinePath) {
  const dir = planDir(outlinePath);
  return path.join(dir, `${reportName(outlinePath)}_章节设计清单.md`);
}

/**
 * 创建章节设计清单
 * @param {string} outlinePath — 大纲文件路径
 * @param {Array<{num: string, title: string}>} chapters — 章节对象数组
 * @returns {string} 清单文件路径
 */
function createChecklist(outlinePath, chapters) {
  const dir = planDir(outlinePath);
  fs.mkdirSync(dir, { recursive: true });

  const lines = ['# 章节设计清单', ''];
  for (const ch of chapters) {
    lines.push(`- [ ] Ch${ch.num} ${ch.title}`);
  }
  lines.push('');

  const fp = checklistPath(outlinePath);
  fs.writeFileSync(fp, lines.join('\n'), 'utf-8');
  return fp;
}

/**
 * 将指定章节标记为已完成
 * @param {string} outlinePath — 大纲文件路径
 * @param {string|number} chapterNum — 章节编号
 */
function markChapterDone(outlinePath, chapterNum) {
  const fp = checklistPath(outlinePath);
  if (!fs.existsSync(fp)) {
    throw new Error(`清单文件不存在: ${fp}`);
  }

  const content = fs.readFileSync(fp, 'utf-8');
  const lines = content.split('\n');
  const pattern = new RegExp(`^(\\- \\[ \\]) (Ch${chapterNum}\\s)`);

  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      lines[i] = lines[i].replace('- [ ] ', '- [x] ');
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error(`未找到章节 Ch${chapterNum} 或该章节已完成`);
  }

  fs.writeFileSync(fp, lines.join('\n'), 'utf-8');
}

/**
 * 读取清单中尚未完成的章节编号
 * @param {string} outlinePath — 大纲文件路径
 * @returns {string[]|null} 未完成章节编号数组，清单不存在时返回 null
 */
function readChecklist(outlinePath) {
  const fp = checklistPath(outlinePath);
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

module.exports = { createChecklist, markChapterDone, readChecklist };
