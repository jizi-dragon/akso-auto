/**
 * 审批状态管理模块
 * 通过 .qrs-state.json 持久化大纲审批状态，强制两步审批流程
 */

const fs = require('fs');
const path = require('path');

function statePath(outlinePath) {
  const dir = path.dirname(path.resolve(outlinePath));
  return path.join(dir, '.qrs-state.json');
}

function readState(outlinePath) {
  const sp = statePath(outlinePath);
  if (!fs.existsSync(sp)) return null;
  try {
    return JSON.parse(fs.readFileSync(sp, 'utf-8'));
  } catch {
    return null;
  }
}

function createState(outlinePath, meta = {}) {
  const state = {
    outlinePath: path.resolve(outlinePath),
    inputPath: meta.inputPath || '',
    extractedAt: new Date().toISOString(),
    approved: false,
    approvedAt: null,
    chapterCount: meta.chapterCount || 0
  };
  fs.writeFileSync(statePath(outlinePath), JSON.stringify(state, null, 2), 'utf-8');
  return state;
}

function approve(outlinePath) {
  const state = readState(outlinePath);
  if (!state) return null;
  state.approved = true;
  state.approvedAt = new Date().toISOString();
  fs.writeFileSync(statePath(outlinePath), JSON.stringify(state, null, 2), 'utf-8');
  return state;
}

function isApproved(outlinePath) {
  const state = readState(outlinePath);
  return !!(state && state.approved);
}

function resetApproval(outlinePath) {
  const state = readState(outlinePath);
  if (!state) return;
  state.approved = false;
  state.approvedAt = null;
  fs.writeFileSync(statePath(outlinePath), JSON.stringify(state, null, 2), 'utf-8');
}

function requireApproval(outlinePath, toolName) {
  if (!fs.existsSync(outlinePath)) {
    console.error('大纲文件不存在。请先执行 extract 生成大纲文件。');
    process.exit(1);
  }
  const state = readState(outlinePath);
  if (!state) {
    console.error('未找到审批状态文件。请先执行 extract 生成大纲文件。');
    process.exit(1);
  }
  if (!state.approved) {
    console.error(`[${toolName}] 大纲尚未审批。`);
    console.error(`请先审查 "${path.basename(outlinePath)}"，确认无误后执行:`);
    console.error(`  node tools/qrs-report-creator/index.js approve --outline "${outlinePath}"`);
    process.exit(1);
  }
  return state;
}

module.exports = {
  readState, createState, approve, isApproved, resetApproval, requireApproval
};
