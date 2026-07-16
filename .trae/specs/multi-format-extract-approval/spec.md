# 两步审批工作流 Spec

## Why

当前 `tools/qrs-report-creator` 的 `all` 命令直接串联提取→创建→设计，未强制用户审查大纲。文档读取可能存在误差（隐式标题遗漏、样式异常等），必须先确认大纲内容无误再写入系统，避免错误数据。

## What Changes

- **BREAKING**: 新增两步审批机制：`extract` 生成大纲后标记"待审批"，`create`/`design` 必须在大纲审批通过后才允许执行
- 新增 `approve` 子命令：用户审查通过后执行，标记大纲为"已审批"
- 新增 `status` 子命令：查看当前大纲状态（是否已提取、是否已审批、章节数等）
- `lib/` 增加 `state-manager.js`（审批状态管理，基于 JSON 文件）
- 对非 `.docx` 格式输入：明确拒绝并提示用户转换为 `.docx`

## Impact

- Affected specs: `create-qrs-report-tool`（已完成）— 本次是对同一工具的增强
- Affected code: `tools/qrs-report-creator/index.js`（修改 extract/create/design/all 逻辑）、`lib/state-manager.js`（新增）
- 无新增依赖

## ADDED Requirements

### Requirement: 两步审批工作流

系统 SHALL 在 `extract` 和 `create`/`design` 之间强制执行审批门控，确保用户审查大纲后才能写入系统。

#### Scenario: 正常审批流程
- **WHEN** 用户执行 `extract` 成功生成大纲
- **THEN** 系统在大纲文件同级目录创建 `.qrs-state.json`，标记 `approved: false`
- **AND** 提示用户："请审查完整大纲.txt，确认无误后执行: node ... approve --outline 完整大纲.txt"
- **WHEN** 用户审查通过后执行 `approve --outline 完整大纲.txt`
- **THEN** 更新 `.qrs-state.json` 中 `approved: true`，提示"审批通过，可执行 create / design"

#### Scenario: 未审批即执行 create/design
- **WHEN** 用户在未审批状态下执行 `create` 或 `design`
- **THEN** 系统拒绝执行，输出明确的提示信息，退出码非 0

#### Scenario: 无状态文件
- **WHEN** `.qrs-state.json` 不存在
- **THEN** 提示用户先执行 `extract` 生成大纲

#### Scenario: 重新 extract 重置审批
- **WHEN** 用户再次执行 `extract` 覆盖已有大纲
- **THEN** `.qrs-state.json` 中 `approved` 重置为 `false`

#### Scenario: status 查询状态
- **WHEN** 用户执行 `status --outline 完整大纲.txt`
- **THEN** 输出当前状态：是否已提取、是否已审批、章节数、提取时间

### Requirement: 非 docx 格式拒绝

系统 SHALL 对非 `.docx` 输入给出明确提示并拒绝处理。

#### Scenario: 非 docx 文件
- **WHEN** 输入文件扩展名不是 `.docx`
- **THEN** 输出："仅支持 .docx 格式。当前文件为 .xxx，请先用 Word 另存为 .docx 格式后重试。"
- **AND** 退出码非 0

### Requirement: 审批状态持久化

系统 SHALL 将审批状态持久化到 `.qrs-state.json` 文件中。

#### Scenario: 状态文件格式
- **WHEN** 系统创建状态文件
- **THEN** 文件内容为 JSON：`{ "outlinePath", "inputPath", "extractedAt", "approved", "approvedAt", "chapterCount" }`
