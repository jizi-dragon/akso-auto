# QRS 工具输出目录重构与证据链统一 Spec

## Why

当前 QRS 工具输出分散在 `output/qrs/txt/`（大纲）、`output/qrs/plan/`（清单）、根目录 `.qrs-state.json`（状态）三个位置，同一份报告的文件散落各处，排查问题时需要跨目录追溯。且 check 文件要到 design 阶段才生成，在此之前 AI 无法感知整体进度。需整合为以报告为单位的项目文件夹，并将状态文件合并到 check 文件中，形成从 extract 到 design 的完整证据链。

## What Changes

- **BREAKING**: `output/qrs/txt/` 和 `output/qrs/plan/` 目录废弃，改为 `output/qrs/<报告名>/` 项目级文件夹
- check 文件生成时机从 design 提前到 extract，与大纲文件同步产出
- `.qrs-state.json` 内容合并到 check 文件中作为证据戳（顶部元信息），不再单独维护
- check 文件新增两个顶层勾选项：`审阅通过`、`创建章节`
- 重命名：plan → check（文件名 `_check.md`）
- 所有运行时代码更新路径引用：`index.js`、`state-manager.js`、`checklist-manager.js`、`chapter-automation.js`

## Impact

- Affected specs: `qrs-tool-checkpoint-enhance`（OBSOLETED）、`create-qrs-report-tool`（MODIFIED）
- Affected code:
  - `tools/qrs-report-creator/index.js` — 所有路径常量更新
  - `tools/qrs-report-creator/lib/checklist-manager.js` — 路径推导重写、新增证据戳读写
  - `tools/qrs-report-creator/lib/state-manager.js` — approve/status 操作改为读写 check 文件
  - `tools/qrs-report-creator/README.md` — 同步更新

## ADDED Requirements

### Requirement: 项目级输出文件夹

系统 SHALL 在 `output/qrs/` 下以报告名称创建项目文件夹，该报告的所有产物（大纲、check 文件、浏览器状态等）均存入此文件夹。

#### Scenario: extract 时自动创建项目文件夹
- **GIVEN** 输入文档为 `2025年检验异常年度质量回顾报告.docx`
- **WHEN** 执行 extract
- **THEN** 创建 `output/qrs/2025年检验异常年度质量回顾报告/` 目录
- **AND** 大纲文件输出为 `output/qrs/2025年检验异常年度质量回顾报告/大纲.txt`
- **AND** check 文件输出为 `output/qrs/2025年检验异常年度质量回顾报告/check.md`

### Requirement: check 文件替代 .qrs-state.json 作为单一证据源

系统 SHALL 在 extract 阶段生成 `check.md` 文件（与大纲同步），包含以下内容：

**顶部证据戳**（YAML front-matter 风格，纯 Markdown 代码块）：
- 提取时间
- 来源文档路径
- 章节数
- 审查问题数（如有）

**执行进度**区域，包含两个顶层勾选项：
- `- [ ] 审阅通过` — 初始未勾选，approve 命令执行后勾选
- `- [ ] 创建章节` — 初始未勾选，create 命令全部成功后勾选

**章节设计清单**区域（现有内容）：
- 每章一行 `- [ ] ChN 标题`

#### Scenario: extract 后 check 文件结构
- **GIVEN** extract 成功完成
- **WHEN** 查看 check.md
- **THEN** 顶部含证据戳代码块
- **AND** 含 `- [ ] 审阅通过` 和 `- [ ] 创建章节`
- **AND** 含章节设计清单

#### Scenario: approve 标记审阅通过
- **GIVEN** check.md 中 `审阅通过` 为 `[ ]`
- **WHEN** 执行 approve 命令
- **THEN** check.md 中 `审阅通过` 变为 `[x]`

#### Scenario: create 完成后标记创建章节
- **GIVEN** 所有章节创建成功
- **WHEN** create 命令完成
- **THEN** check.md 中 `创建章节` 变为 `[x]`

### Requirement: requireApproval 改为读取 check 文件

系统 SHALL 将 `requireApproval` 校验从读取 `.qrs-state.json` 改为读取 check 文件中 `审阅通过` 复选框状态。

#### Scenario: 未审批时拒绝 create/design
- **GIVEN** check.md 中 `审阅通过` 为 `[ ]`
- **WHEN** 执行 create 或 design
- **THEN** 输出提示"请先审阅大纲并执行 approve"，拒绝执行

### Requirement: 移除 .qrs-state.json 依赖

系统 SHALL 移除对 `output/qrs/txt/.qrs-state.json` 的读写。`state-manager.js` 的 `approve`、`readState` 操作改为读写 check 文件。

#### Scenario: approve 命令不再产生 .qrs-state.json
- **GIVEN** 旧的 `.qrs-state.json` 不存在
- **WHEN** 执行 approve
- **THEN** 仅更新 check.md，不创建 `.qrs-state.json`

## MODIFIED Requirements

### Requirement: checklist-manager.js 路径推导

原：`planDir()` 取大纲所在目录的父级 qrs/ 再拼接 plan/
新：取报告名称，直接在 `output/qrs/<报告名>/` 下读写 `check.md`

### Requirement: 目录隔离原则（project_rules.md）

原 `output/qrs/txt/`、`output/qrs/plan/` 的目录描述更新为 `output/qrs/<报告名>/`

## REMOVED Requirements

### Requirement: 输出目录分层（txt/ / plan/ / temp/）

**Reason**：由项目级文件夹替代，文件不再跨目录分散
**Migration**：extract 输出路径从 `output/qrs/txt/大纲_<名>.txt` 改为 `output/qrs/<报告名>/大纲.txt`
