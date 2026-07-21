/**
 * Akso eGMP 基础配置 — DOM 执行工具
 * 
 * 用法:
 *   node tools/akso-basic-config/index.js --help
 * 
 * 详细文档见 README.md
 */

const path = require('path');
const fs = require('fs');

function printUsage() {
  const libDir = path.join(__dirname, 'lib');
  const scripts = fs.readdirSync(libDir).filter(f => f.endsWith('.js'));
  
  console.log('Akso eGMP 基础配置 — DOM 执行工具\n');
  console.log('可用模块 (lib/):');
  for (const s of scripts) {
    console.log(`  node tools/akso-basic-config/lib/${s}`);
  }
  console.log('\n详细文档见 README.md');
}

printUsage();
