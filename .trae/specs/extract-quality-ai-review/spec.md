# 提取质量优化 Spec — 表格/图片检测 + AI 二次审查

## Why

当前 Node.js 版 `extract-outline.js` 仅解析 `<w:p>` 段落节点，完全忽略 `<w:tbl>`（表格）和 `<w:drawing>`（图片）节点的检测，导致：
- 表格单元格文本被混入正文（如标准限值"143202507001 / 未检出 / ≤1.4%"被误写成多行正文）
- 子标题错误归类为一级标题（编号格式误匹配）
- 无 `[表格：...]` / `[图片：...]` 占位标记

Python 版 `extract_v4.py` 的 Pass 2 已实现了 XML body 遍历检测表格/图片的逻辑，Node.js 版需要等效实现。

另外，提取后缺少 AI 自动审查机制，导致用户需要逐一核对 21 章 × 数十行内容，负担过大。

## What Changes

- **MODIFIED** `lib/extract-outline.js`：
  - 新增 Pass 2：遍历 `document.xml` body 子元素序列，检测 `<w:tbl>` 和 `<w:drawing>`，根据上下文注入 `[表格：...]` / `[图片：...]` 占位符
  - 表格检测：提取表格首行/首列文本 → 自动推断表格描述（如"质量标准及监测频次"、"批号-检测结果对照表"）
  - 图片检测：通过前一段落的文本主题推断图片类型（如"趋势图"、"分布图"、"流程图"）
  - 正文源切换：检测到表格后直到下一个非表格段落之间，表格内文本不计入正文 content
  - 一级标题严格化：只有 Title/Heading1 样式且编号不含 `.` 的段落才归为 chapter；Normal 样式一律归为 sub
- **ADDED** `lib/review-outline.js`（AI 审查模块）：
  - `reviewQuality(text)` — 从大纲文件中检测三类常见问题：
    1. **误入一级标题** — 长度 > 20 字或含特殊字符（`：≤`、`mg/`）的标号段
    2. **表格文本泄露** — 连续短行（≤5字）超过 3 行且无编号 → 疑似表格碎片
    3. **标题正文粘连** — 同一行中标题编号后紧跟正文描述（如 `9.1 偏差回顾 偏差编号...`）
  - 输出结构化审查报告，列出每个可疑点（章节号 + 问题类型 + 原文 + 建议）
  - `applyFixes(text, review)` — 根据审查报告自动修正（可选）
- 新增 `review` 子命令：`node ... review --outline 完整大纲.txt`
- 修改 `extract` 流程：extract 完成后自动执行 review，审查结果一并展示给用户
- `state-manager.js` 增加审查状态字段

## Impact

- Affected specs: `multi-format-extract-approval`（扩展审批流程）
- Affected code: `lib/extract-outline.js`（重写解析引擎）、`lib/review-outline.js`（新增）、`lib/state-manager.js`（字段扩展）、`index.js`（新增 review 子命令 + extract 集成）
- 无新增 npm 依赖

## ADDED Requirements

### Requirement: 表格检测与占位符注入

系统 SHALL 遍历 `document.xml` body 子元素序列（`<w:p>` / `<w:tbl>` / `<w:sdt>`），检测表格节点并为其所在章节注入 `[表格：描述]` 占位标记。

#### Scenario: 普通表格
- **GIVEN** XML body 中存在 `<w:tbl>` 节点，其前一段落属于 Ch3「可见异物」
- **WHEN** 系统解析到该 `<w:tbl>`
- **THEN** 输出 `[表格：可见异物检验结果对照表]`，表格单元格文本不写入正文

#### Scenario: sdt 包裹表格
- **WHEN** `<w:sdt>` 节点内包含 `<w:tbl>`
- **THEN** 与普通表格同样处理

#### Scenario: 表格描述推断
- **WHEN** 前一段落文本含"质量标准""监测" → 描述为"质量标准及监测频次"
- **WHEN** 前一段落文本含"批号""检测结果" → 描述为"检验结果对照表"
- **WHEN** 无法推断 → 描述为"数据表"

### Requirement: 图片检测与占位符注入

系统 SHALL 检测 `<w:drawing>` / `<wp:inline>` / `<a:blip>` 节点，注入 `[图片：描述]` 占位标记。

#### Scenario: 段落内图片
- **WHEN** `<w:p>` 内包含 `<w:drawing>` 或 `<wp:inline>`
- **THEN** 根据前一段落标题推断图片类型，注入占位符

#### Scenario: 图片描述推断
- **WHEN** 标题含"趋势图"/"趋势分析" → "趋势图"
- **WHEN** 标题含"分布图" → "分布图"
- **WHEN** 标题含"流程图" → "流程图"
- **WHEN** 无法推断 → "图表"

### Requirement: 一级标题严格化

系统 SHALL 仅将满足以下全部条件的段落归为一级章节（chapter）：样式为 Title 或 Heading1，且编号不含小数点。

#### Scenario: Normal 中误匹配
- **GIVEN** Normal 样式段落文本为 `8.75 -9.25`
- **WHEN** 提取引擎处理
- **THEN** 不归为章节，归入正文（编号虽有数字但非标题结构）

#### Scenario: 数值数据误判
- **GIVEN** 段落文本为 `≤1.4%`、`N/A`、`100%`
- **WHEN** 提取引擎处理
- **THEN** 不匹配为标题，归入正文

### Requirement: AI 二次审查

系统 SHALL 在 extract 完成后自动执行结构审查，检测三类常见问题并输出审查报告。

#### Scenario: 误入一级标题检测
- **GIVEN** TOC 中某一级标题长度 > 30 字
- **WHEN** 审查器分析
- **THEN** 标记为"可能误入一级标题：标题过长，疑似正文段落"

#### Scenario: 表格文本泄露检测
- **GIVEN** 正文区内连续出现 3+ 行短文本（≤8字）且无编号前缀
- **WHEN** 审查器分析
- **THEN** 标记为"疑似表格数据泄漏：连续短文本行"

#### Scenario: 标题正文粘连检测
- **GIVEN** 某行标题编号后紧跟超过 30 字的长描述（如 `9.1 偏差回顾 偏差编号 偏差内容...`）
- **WHEN** 审查器分析
- **THEN** 标记为"标题与正文粘连：编号后文本过长"

#### Scenario: 审查报告输出
- **WHEN** 审查完成
- **THEN** 输出报告含：检测到的问题总数、按章节分组的问题列表、每个问题的原文片段和建议操作

### Requirement: review 子命令

系统 SHALL 提供独立的 `review` 子命令供用户随时检查大纲质量。

#### Scenario: 独立审查
- **WHEN** 用户执行 `node ... review --outline 完整大纲.txt`
- **THEN** 输出审查报告，不修改大纲文件

#### Scenario: extract 自动审查
- **WHEN** 用户执行 `extract`
- **THEN** 提取完成后自动执行 review，审查结果随大纲一起展示
