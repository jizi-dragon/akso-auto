# Tasks

- [x] Task 1: 重写 extract-outline.js — XML body 遍历检测表格和图片
  - [x] SubTask 1.1: 实现 `parseBodyElements(xml)` — 遍历 `doc.element.body` 的子元素序列，维护有序的「段落→表格→段落→图片」顺序
  - [x] SubTask 1.2: 实现 `inferTableDesc(prevSectionTitle)` — 根据前一段落标题推断表格描述
  - [x] SubTask 1.3: 实现 `inferImageDesc(prevSectionTitle)` — 根据标题推断图片类型
  - [x] SubTask 1.4: 重构 `extractSections()` — 接收 body 元素序列，表格文本不进 content，图片注入 media_placeholders
  - [x] SubTask 1.5: 严格化一级标题判定：仅 Title/Heading1 + 无小数点 → chapter

- [x] Task 2: 新增 review-outline.js — AI 结构审查模块
  - [x] SubTask 2.1: 实现 `reviewQuality(fullText)`
  - [x] SubTask 2.2: 检测规则 1：一级标题过长/含数值符号
  - [x] SubTask 2.3: 检测规则 2：连续短行（疑似表格泄漏）
  - [x] SubTask 2.4: 检测规则 3：标题正文粘连
  - [x] SubTask 2.5: 实现 `formatReviewReport(issues)`
  - [x] SubTask 2.6: 实现 `applyAutoFixes(text, issues)`

- [x] Task 3: 集成到 index.js + state-manager.js
  - [x] SubTask 3.1: 新增 `review` 子命令
  - [x] SubTask 3.2: `extract` 完成后自动调用 `reviewQuality()`
  - [x] SubTask 3.3: `state-manager.js` 增加 `reviewed` / `reviewIssues` 字段

- [x] Task 4: 更新 README 文档
  - [x] SubTask 4.1: 子命令表新增 `review` 命令
  - [x] SubTask 4.2: 三阶段流程图更新（extract → 自动审查 → 确认 → approve → create/design）
