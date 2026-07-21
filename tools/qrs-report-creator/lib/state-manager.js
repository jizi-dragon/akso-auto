/**
 * 审批状态管理模块
 * 通过 check.md 中的「审阅通过」复选框管理审批状态，替代 .qrs-state.json
 */

const fs = require('fs');
const path = require('path');
const { createCheckFile, markCheckItem, isCheckItemChecked } = require('./checklist-manager');

/**
 * 创建执行状态（extract 阶段调用）
 * 委托给 createCheckFile，同时记录到 check.md 证据戳中
 */
function createState(outlinePath, meta = {}) {
  const evidence = {
    extractedAt: new Date().toISOString(),
    inputPath: meta.inputPath || '',
    chapterCount: meta.chapterCount || 0,
    reviewIssues: meta.reviewIssues || 0
  };
  // chapters 由 index.js 在 createState 之前已解析，此处由 index.js 调用 createCheckFile 直接传入
  // 为保持接口兼容，createState 仅记录元数据
  return { outlinePath, ...evidence, approved: false, reviewed: meta.reviewed || false };
}

/**
 * 读取执行状态（从 check.md 中解析）
 */
function readState(outlinePath) {
  const { checkPath } = require('./checklist-manager');
  const fp = checkPath(outlinePath);
  if (!fs.existsSync(fp)) return null;

  const content = fs.readFileSync(fp, 'utf-8');
  const state = {
    outlinePath: path.resolve(outlinePath),
    inputPath: '',
    extractedAt: '',
    approved: false,
    approvedAt: null,
    chapterCount: 0,
    reviewed: false,
    reviewIssues: 0
  };

  // 解析证据戳代码块
  const evBlock = content.match(/```\n([\s\S]*?)```/);
  if (evBlock) {
    const ev = evBlock[1];
    const mExtractedAt = ev.match(/提取时间:\s*(.+)/);
    const mInputPath = ev.match(/来源文档:\s*(.+)/);
    const mChapterCount = ev.match(/章节数:\s*(\d+)/);
    const mReviewIssues = ev.match(/审查问题:\s*(\d+)/);
    if (mExtractedAt) state.extractedAt = mExtractedAt[1].trim();
    if (mInputPath) state.inputPath = mInputPath[1].trim();
    if (mChapterCount) state.chapterCount = parseInt(mChapterCount[1]);
    if (mReviewIssues) { state.reviewed = true; state.reviewIssues = parseInt(mReviewIssues[1]); }
  }

  // 读取审阅状态
  state.approved = isCheckItemChecked(outlinePath, '审阅通过');

  return state;
}

/**
 * 标记审阅通过
 */
function approve(outlinePath) {
  markCheckItem(outlinePath, '审阅通过');
  return readState(outlinePath);
}

function isApproved(outlinePath) {
  return isCheckItemChecked(outlinePath, '审阅通过');
}

function resetApproval(outlinePath) {
  const { checkPath } = require('./checklist-manager');
  const fp = checkPath(outlinePath);
  if (!fs.existsSync(fp)) return;

  const content = fs.readFileSync(fp, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '- [x] 审阅通过') {
      lines[i] = '- [ ] 审阅通过';
      break;
    }
  }
  fs.writeFileSync(fp, lines.join('\n'), 'utf-8');
}

function markReviewed(outlinePath, issuesCount) {
  // reviewed 状态已在 createCheckFile 时记录到证据戳
  // 此函数保留接口兼容性，不再单独维护 .qrs-state.json
  return readState(outlinePath);
}

function requireApproval(outlinePath, toolName) {
  if (!fs.existsSync(outlinePath)) {
    console.error('大纲文件不存在。请先执行 extract 生成大纲文件。');
    process.exit(1);
  }
  if (!isCheckItemChecked(outlinePath, '审阅通过')) {
    console.error(`[${toolName}] 大纲尚未审批。`);
    console.error(`请先审查 "${path.basename(outlinePath)}"，确认无误后执行:`);
    console.error(`  node tools/qrs-report-creator/index.js approve --outline "${outlinePath}"`);
    process.exit(1);
  }
  return readState(outlinePath);
}

module.exports = {
  readState, createState, approve, isApproved, resetApproval, requireApproval, markReviewed
};
