/**
 * Akso eGMP 基础配置 — API 直调执行工具
 * 薄壳入口，核心逻辑在 lib/index.js
 */
module.exports = require('./lib/index');

if (require.main === module) {
  console.log('Akso eGMP 基础配置 — API 直调执行工具');
  console.log('详细文档见 README.md');
}
