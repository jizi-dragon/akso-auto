# QRS 工具分章设计与输出目录重构 Spec

## Why

当前 QRS 工具在章节设计阶段存在两个问题：一是 11 章连续执行，中途出错全部重来；二是输出文件散落在 `output/qrs/` 根目录，缺少分类管理。需将设计脚本拆分为逐章独立执行，增加 checklist 进度追踪，并整理输出目录结构。

## What Changes

- **BREAKING**: 大纲输出位置从 `output/qrs/` 改为 `output/qrs/txt/`
- 新增 `output/qrs/plan/` 目录，存放章节设计的 checklist 文件
- 新增 `output/qrs/temp/` 目录，存放临时调试脚本
- 章节设计脚本分离：`index.js design` 改为逐章调用内部函数，单章失败不影响后续
- 新增 checklist 机制：设计开始时生成 checklist.md，每完成一章划掉对应条目
- 键盘输入延迟从 100ms/字符 降至 60ms/字符

## Impact

- Affected specs: `create-qrs-report-tool`（MODIFIED）
- Affected code: `tools/qrs-report-creator/index.js`、`lib/chapter-automation.js`、`lib/extract-outline.js`

## ADDED Requirements

### Requirement: 输出目录分层

系统 SHALL 在 `output/qrs/` 下维护三个子目录：
- `txt/` — 存放大纲提取结果（`.txt`）
- `plan/` — 存放章节设计 checklist 文件（`.md`）
- `temp/` — 存放调试产生的临时脚本

#### Scenario: extract 输出到 txt/
- **GIVEN** 用户执行 extract
- **WHEN** 输出路径未通过 `--output` 显式指定
- **THEN** 默认输出到 `output/qrs/txt/大纲_<报告名>.txt`

#### Scenario: 显式指定输出路径仍生效
- **GIVEN** 用户执行 extract 并指定 `--output /custom/path/out.txt`
- **WHEN** 提取完成
- **THEN** 文件写入用户指定路径，不自动归入 txt/

### Requirement: Checklist 进度追踪

系统 SHALL 在章节设计阶段生成一个 checklist 文件到 `output/qrs/plan/`，文件命名规则为 `<报告名>_章节设计清单.md`。每完成一章设计，同步更新 checklist 将该章标记为已完成。

#### Scenario: 设计开始时生成 checklist
- **GIVEN** 用户执行 `design --chapters 1,2,3`
- **WHEN** 设计开始
- **THEN** 在 `output/qrs/plan/` 下生成 checklist 文件，列出所有待设计章节为未完成状态

#### Scenario: 每完成一章更新 checklist
- **GIVEN** Ch1 设计成功
- **WHEN** 章节设计完成
- **THEN** checklist 中 Ch1 条目标记为 `[x]`

#### Scenario: 中途失败保留进度
- **GIVEN** Ch1-Ch3 已完成，Ch4 设计失败
- **WHEN** 用户重新执行 design 跳过已完成的章节
- **THEN** checklist 中 Ch1-Ch3 保持 `[x]`，仅执行未完成的章节

### Requirement: 逐章独立设计

系统 SHALL 将章节设计拆分为逐章独立执行，单章失败不影响已完成及后续章节。

#### Scenario: 单章失败继续后续
- **GIVEN** Ch4 设计时遇到元素定位失败
- **WHEN** 错误发生
- **THEN** 记录 Ch4 失败，继续执行 Ch5，不中止整个流程

#### Scenario: 已完成章节不重复设计
- **GIVEN** checklist 中 Ch1 已标记完成
- **WHEN** 用户再次执行 design（含 Ch1 范围）
- **THEN** 跳过 Ch1，从第一个未完成的章节继续

### Requirement: 输入速度提升

系统 SHALL 将键盘输入延迟从 100ms/字符 降低至 60ms/字符。

#### Scenario: 快速输入
- **GIVEN** 章节内容需写入编辑器
- **WHEN** 逐字符输入
- **THEN** 每字符间隔 60ms

## MODIFIED Requirements

### Requirement: 文档大纲提取（Phase 1）

默认输出路径从 `output/qrs/` 变更为 `output/qrs/txt/`。其余行为不变。

### Requirement: 章节内容设计模块

设计流程新增 checklist 进度追踪与逐章独立执行。输入延迟降至 60ms/字符。
