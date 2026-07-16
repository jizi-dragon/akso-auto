# Checklist

- [x] `extract-outline.js` 解析 `<w:tbl>` 节点，注入 `[表格：...]` 占位符，表格文本不进入正文 content
- [x] `extract-outline.js` 解析 `<w:drawing>` / `<wp:inline>` / `<a:blip>` 节点，注入 `[图片：...]` 占位符
- [x] 表格描述根据前一段落标题智能推断（质量标准→"质量标准及监测频次"等）
- [x] 图片描述根据前一段落标题推断（趋势图/分布图/流程图/图表）
- [x] Normal 样式段落不再被归为一级 chapter
- [x] `<w:sdt>` 包裹的表格正确处理
- [x] `review-outline.js` 可检测一级标题过长/含数值符号
- [x] `review-outline.js` 可检测连续短文本行 > 3 行（表格泄漏）
- [x] `review-outline.js` 可检测标题正文粘连（编号后长文本）
- [x] 审查报告结构化输出（问题数 + 按章节分组 + 原文+建议）
- [x] `review` 子命令可独立执行
- [x] `extract` 完成后自动审查并展示结果
- [x] `.qrs-state.json` 增加审查状态字段
- [x] README 已更新（新增 review 命令 + 三阶段流程图）
