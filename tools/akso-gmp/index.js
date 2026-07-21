/**
 * AksoGMP 配置编排工具
 * 
 * 负责需求翻译、流程编排决策、质量检查、资源管理。
 * 通过配置蓝图驱动 akso-basic-config（DOM）和 akso-basic-config-api（API）两个执行工具完成自动化配置。
 * 
 * 详细文档见 README.md
 */

const path = require('path');

function printUsage() {
  console.log('═══ AksoGMP 配置编排工具 ═══');
  console.log();
  console.log('核心功能:');
  console.log('  1. 配置前分析 — 理解业务需求，产出配置蓝图');
  console.log('  2. 流程编排决策 — 判断用 DOM 还是 API 执行');
  console.log('  3. 质量检查 — 配置完成后验证完整性');
  console.log('  4. 资源管理 — Playbook 生成和复用');
  console.log();
  console.log('蓝图模板: lib/playbooks/blueprint-template.md');
  console.log('导出脚本: lib/export/pack.sh');
  console.log();
  console.log('详细文档见 README.md');
}

printUsage();
