# QRS 回顾报告创建工具 Spec

## Why

现有 `qrs-review-report-creator` 是一个 SKILL（AI Agent 指令集），包含 Python 提取脚本 + Playwright 浏览器操作模板 + 大量文档经验，但缺乏统一的 Node.js CLI 工具入口。将其改造为项目 `tools/` 下的独立工具，实现从 .docx → 大纲提取 → 系统章节创建 → 内容设计的全流程 CLI 化。

## What Changes

- 新建 `tools/qrs-report-creator/` 工具，遵循项目工具规范（`index.js` + `README.md` + `lib/`）
- 将 Python 提取脚本 `extract_v4.py` 迁移为 `lib/extract-outline.py`，去除硬编码路径，通过命令行参数传入
- 将浏览器自动化脚本 `chapter_automation.js` 重构为 `lib/chapter-automation.js`，调用 `shared/browser-manager.js` 完成登录
- 主入口 `index.js` 串联三阶段：提取 → 创建 → 设计，支持命令行参数指定阶段
- 删除原有 Skill 目录中的重复文档，Skill 中保留引用指向本工具

## Impact

- Affected specs: 无（新建工具）
- Affected code: 新建 `tools/qrs-report-creator/`（3 个强制文件 + Python 脚本），不影响已有代码
- 依赖：`python-docx`（需在 README 中说明安装）、`shared/browser-manager.js`（已有）、`playwright`（已有）

## ADDED Requirements

### Requirement: 文档大纲提取（Phase 1）

系统 SHALL 从用户提供的 `.docx` 文件提取年度产品质量回顾报告的大纲，输出为 `完整大纲.txt` 文件，包含三层结构（TOC 目录 / 完整子标题结构 / 大纲+文字段落）。

#### Scenario: 正常提取
- **GIVEN** 一个符合标准的 .docx 回顾报告模板
- **WHEN** 用户执行 `node tools/qrs-report-creator/index.js extract --input template.docx --output 完整大纲.txt`
- **THEN** 生成的三板块大纲文件包含所有一级标题（TOC）、子标题结构（缩进层级）、文字段落和图表占位标记
- **AND** 输出中每个一级章节前有 `--- ChN ---` 分隔标记

#### Scenario: 无 Heading 样式文档
- **GIVEN** 一个全文使用 Normal 样式的 .docx 文件
- **WHEN** 用户执行提取命令
- **THEN** 系统通过正则匹配编号和隐式标题检测，仍能正确提取章节结构

#### Scenario: 文件不存在
- **GIVEN** 用户指定的 .docx 路径不存在
- **WHEN** 用户执行提取命令
- **THEN** 返回明确的错误信息，退出码非 0

### Requirement: 系统章节批量创建（Phase 2）

系统 SHALL 通过 Playwright 浏览器自动化，在 Akso eGMP QRS 系统中批量创建一级章节目录。

#### Scenario: 批量创建
- **GIVEN** 已生成的 `完整大纲.txt` 文件
- **WHEN** 用户执行 `node tools/qrs-report-creator/index.js create --outline 完整大纲.txt --baseUrl https://xxx.aksoegmp.com --username user --password pass`
- **THEN** 系统登录后导航到报告模板编辑页，按大纲中的 TOC 板块逐条创建章节目录（名称 + 序号）
- **AND** 创建完成后验证章节数与大纲一致

#### Scenario: 登录失败
- **GIVEN** 提供了错误的用户名或密码
- **WHEN** 用户执行创建命令
- **THEN** 返回明确的登录失败错误信息，退出码非 0

#### Scenario: Code 重复（幂等）
- **GIVEN** 某个章节名称已存在于系统中
- **WHEN** 系统尝试创建该章节
- **THEN** 跳过该章节，继续创建后续章节，日志标记为"已存在，跳过"

### Requirement: 章节内容设计（Phase 3）

系统 SHALL 逐章打开 ONLYOFFICE Canvas 编辑器，通过键盘模拟写入章节大纲文本（标题、子标题、占位标记、正文段落）。

#### Scenario: 单章设计
- **GIVEN** 已创建章节的系统页面 + `完整大纲.txt`
- **WHEN** 用户执行 `node tools/qrs-report-creator/index.js design --chapter N --outline 完整大纲.txt`
- **THEN** 系统定位第 N 章的「设计」按钮，进入编辑器，写入该章在 `[大纲+文字段落]` 板块中的完整内容
- **AND** 写入后双击保存，返回章节列表

#### Scenario: 多章批量设计
- **GIVEN** 多章需要设计
- **WHEN** 用户执行 `node tools/qrs-report-creator/index.js design --chapters 1,2,3,4,5`
- **THEN** 系统逐章完成设计→保存→返回的完整闭环
- **AND** 每章设计为独立操作，单章失败不影响其他章节

#### Scenario: 附件章节
- **GIVEN** 某章标记为 `is_attachment`
- **WHEN** 系统执行设计
- **THEN** 该章直接跳过内容写入，仅保存返回

### Requirement: 全流程一键执行（Phase All）

系统 SHALL 支持一键执行提取→创建→设计的完整流水线。

#### Scenario: 全流程
- **GIVEN** 一个 .docx 模板文件 + 系统登录凭证
- **WHEN** 用户执行 `node tools/qrs-report-creator/index.js all --input template.docx`
- **THEN** 自动完成：提取大纲 → 创建章节 → 逐章设计内容
- **AND** 每阶段完成后输出进度信息

### Requirement: 工具结构合规

系统 SHALL 遵循项目 tools 目录结构规范。

#### Scenario: 文件结构
- **GIVEN** `tools/qrs-report-creator/` 目录
- **THEN** 必须包含 `index.js`（主入口，支持命令行参数）
- **AND** 必须包含 `README.md`（工具介绍及 AI Agent 使用说明）
- **AND** 必须包含 `lib/` 目录（内部模块）
- **AND** `lib/` 中至少包含 `extract-outline.py`（Python 提取脚本）和 `chapter-automation.js`（浏览器自动化模块）
- **AND** 工具不引用其他 tools 目录下的内部实现
