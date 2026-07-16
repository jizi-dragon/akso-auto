/**
 * 大纲质量审查模块
 * 
 * 对完整大纲.txt 进行 AI 驱动的结构化审查，检测三类问题：
 *   1. 误入一级标题 — TOC 中混入了数据行/长文本
 *   2. 表格文本泄露 — 正文中混入了表格短行数据
 *   3. 标题正文粘连 — 标题与正文未正确分行
 * 
 * 用法：
 *   node tools/qrs-report-creator/lib/review-outline.js --input 完整大纲.txt
 *   node tools/qrs-report-creator/lib/review-outline.js --input 完整大纲.txt --fix
 */

const fs = require('fs');

const RULE1_KEYWORDS = /[≤%]|mg\/ml|mOsmol|N\/A/;
const RULE1_DATE = /^\d{4}\.\d{2}/;
const RULE3_HEADING = /^([\d.]+\s+.+)/;

/**
 * 审查大纲文本质量
 * @param {string} fullText - 完整大纲.txt 的完整文本
 * @returns {{ issues: Array, summary: { totalIssues: number, byType: Object } }}
 */
function reviewQuality(fullText) {
  const lines = fullText.split('\n');
  const issues = [];

  let tocStart = -1, tocEnd = -1, bodyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '[TOC 目录]') { tocStart = i; }
    if (tocStart >= 0 && tocEnd < 0 && t === '[完整子标题结构]') { tocEnd = i; }
    if (t === '[大纲 + 文字段落]') { bodyStart = i; }
  }

  // ---- 规则1：误入一级标题（仅扫描 TOC 区域） ----
  if (tocStart >= 0 && tocEnd > tocStart) {
    const tocLines = lines.slice(tocStart + 2, tocEnd);
    for (let li = 0; li < tocLines.length; li++) {
      const lineNo = tocStart + 2 + li + 1;
      const line = tocLines[li].trim();
      if (!line) continue;
      const m = line.match(/^(\d+)\s+(.+)/);
      if (!m) continue;
      const chapter = m[1];
      const content = m[2];

      let flagged = false;
      if (content.length > 25) flagged = true;
      if (RULE1_KEYWORDS.test(line)) flagged = true;
      if (RULE1_DATE.test(content)) flagged = true;

      if (flagged) {
        issues.push({
          chapter,
          lineNo,
          type: '误入一级标题',
          original: line,
          suggestion: '该行可能不是一级章节标题，请检查是否误将数据行/正文归类为章节'
        });
      }
    }
  }

  // ---- 规则2 & 规则3：正文区域扫描 ----
  if (bodyStart >= 0) {
    const bodyLines = lines.slice(bodyStart + 2);
    let currentChapter = '';
    let consecutiveShort = [];

    for (let li = 0; li < bodyLines.length; li++) {
      const lineNo = bodyStart + 2 + li + 1;
      const line = bodyLines[li];
      const trimmed = line.trim();

      const chMatch = trimmed.match(/^---\s*Ch(\d+)\s*---/);
      if (chMatch) {
        currentChapter = chMatch[1];
        consecutiveShort = [];
        continue;
      }

      if (!trimmed) continue;

      // 规则3：标题正文粘连
      const headingMatch = trimmed.match(RULE3_HEADING);
      if (headingMatch && trimmed.length > 40) {
        issues.push({
          chapter: currentChapter,
          lineNo,
          type: '标题正文粘连',
          original: trimmed,
          suggestion: '标题后文本过长，可能标题与正文未正确分行。建议在第一个句号后换行'
        });
      }

      // 规则2：表格文本泄露
      const isShort = trimmed.length <= 8 && !/^\d/.test(trimmed);
      if (isShort) {
        consecutiveShort.push({ lineNo, line: trimmed });
        if (consecutiveShort.length >= 3) {
          const start = consecutiveShort[0];
          issues.push({
            chapter: currentChapter,
            lineNo: start.lineNo,
            type: '表格文本泄露',
            original: consecutiveShort.map(s => s.line).join('\n'),
            suggestion: '连续短文本行可能来自表格数据，请检查原文是否包含表格'
          });
          consecutiveShort = [];
        }
      } else {
        consecutiveShort = [];
      }
    }
  }

  const byType = {};
  for (const issue of issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  }

  return {
    issues,
    summary: {
      totalIssues: issues.length,
      byType
    }
  };
}

/**
 * 格式化审查报告为终端输出
 * @param {{ issues: Array, summary: Object }} reviewResult
 * @returns {string}
 */
function formatReviewReport(reviewResult) {
  const { issues, summary } = reviewResult;
  const lines = [];

  lines.push('==== 大纲质量审查报告 ====');
  lines.push('共检测到 ' + summary.totalIssues + ' 个问题');
  lines.push('');

  const typeLabels = ['误入一级标题', '表格文本泄露', '标题正文粘连'];

  for (const typeLabel of typeLabels) {
    const group = issues.filter(i => i.type === typeLabel);
    if (group.length === 0) continue;
    lines.push('[' + typeLabel + '] (' + group.length + '个)');

    for (const issue of group) {
      let prefix = '  ';
      if (issue.chapter !== undefined && issue.chapter !== '') {
        prefix += 'Ch' + issue.chapter + ': ';
      }

      if (issue.type === '表格文本泄露') {
        prefix += '第' + issue.lineNo + '行附近: ';
        lines.push(prefix + issue.suggestion);
      } else {
        let excerpt = issue.original;
        if (excerpt.length > 40) {
          excerpt = excerpt.substring(0, 40) + '...';
        }
        lines.push(prefix + '"' + excerpt + '" → ' + issue.suggestion);
      }
    }

    lines.push('');
  }

  lines.push('============================');
  return lines.join('\n');
}

/**
 * 自动修复（仅处理 100% 确定的问题）
 * - 规则3：标题正文粘连 → 在第一个句号/分号/逗号后换行
 * - 规则1/2：不确定的问题 → 添加 ⚠ 标记注释
 * @param {string} text - 完整大纲文本
 * @param {Array} issues - reviewQuality 返回的 issues
 * @returns {string} 修复后的文本
 */
function applyAutoFixes(text, issues) {
  if (!issues || issues.length === 0) return text;

  const sorted = [...issues].sort((a, b) => b.lineNo - a.lineNo);
  const lines = text.split('\n');

  for (const issue of sorted) {
    const idx = issue.lineNo - 1;
    if (idx < 0 || idx >= lines.length) continue;

    if (issue.type === '标题正文粘连') {
      const orig = lines[idx];
      const headingMatch = orig.trim().match(RULE3_HEADING);
      if (!headingMatch) continue;

      const trimmed = orig.trim();
      let splitAt = -1;
      for (let i = 15; i < trimmed.length; i++) {
        if (trimmed[i] === '\u3002' || trimmed[i] === '\uFF1B' || trimmed[i] === '\uFF0C') {
          splitAt = i;
          break;
        }
      }
      if (splitAt < 0) {
        for (let i = 0; i < trimmed.length; i++) {
          if (trimmed[i] === '\u3002' || trimmed[i] === '\uFF1B' || trimmed[i] === '\uFF0C') {
            splitAt = i;
            break;
          }
        }
      }

      if (splitAt >= 0) {
        const leading = orig.match(/^(\s*)/)[1];
        const part1 = trimmed.substring(0, splitAt + 1);
        const part2 = trimmed.substring(splitAt + 1).trim();
        lines[idx] = leading + part1 + '\n' + leading + part2;
      } else {
        lines.splice(idx, 0, '\u26A0 [\u5BA1\u67E5\u6807\u8BB0] ' + issue.suggestion);
      }
    } else {
      lines.splice(idx, 0, '\u26A0 [\u5BA1\u67E5\u6807\u8BB0] ' + issue.suggestion);
    }
  }

  return lines.join('\n');
}

module.exports = { reviewQuality, formatReviewReport, applyAutoFixes };

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (n) => { const i = args.indexOf(n); return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined; };
  const hasFlag = (f) => args.includes(f);

  const input = getArg('--input');
  const doFix = hasFlag('--fix');

  if (!input) {
    console.error('用法: node review-outline.js --input <完整大纲.txt> [--fix]');
    process.exit(1);
  }

  if (!fs.existsSync(input)) {
    console.error('文件不存在: ' + input);
    process.exit(1);
  }

  const text = fs.readFileSync(input, 'utf-8');
  const result = reviewQuality(text);
  console.log(formatReviewReport(result));

  if (doFix) {
    if (result.summary.totalIssues === 0) {
      console.log('没有需要修复的问题');
    } else {
      const fixed = applyAutoFixes(text, result.issues);
      const outPath = input.replace(/\.txt$/, '_fixed.txt');
      fs.writeFileSync(outPath, fixed, 'utf-8');
      console.log('修复后的文件已输出: ' + outPath);
    }
  } else {
    console.log('\n提示: 使用 --fix 自动应用修复');
  }
}
