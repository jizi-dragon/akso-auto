# Akso 自动化 Skill 体系工程化重构 Spec

## Why
当前三个 Skill（akso-gmp、akso-basic-config、akso-basic-config-api）存在职责不清、内容重叠、格式不一、覆盖范围不足的问题，且缺乏配置前的系统化分析环节。参考外部资源 `AKSO_API_LIFECYCLE_CONFIG.md` 所展示的工程化配置方法论，需要对整个 Skill 体系进行重构，建立「分析→编排→执行→复用」四层工程化体系。

## What Changes
- **重构 akso-gmp**：从「大而全」的精简为「编排者」，聚焦配置前分析、流程编排决策、质量检查，移除底层 DOM/API 操作细节
- **重构 akso-basic-config（DOM 版）**：统一格式为结构化指令表，补全生命周期状态连线、用户动作、阶段组、工作流、菜单、权限等覆盖缺口
- **重构 akso-basic-config-api（API 版）**：统一格式与 DOM 版对齐，补全对应 API 的覆盖缺口，新增未捕获 API 的探索任务
- **新增工程化资源模板**：定义「配置蓝图」标准格式（参考 `AKSO_API_LIFECYCLE_CONFIG.md`），用于配置前的系统化分析
- **统一三 Skill 的内容格式规范**：YAML 元数据头统一、章节编号体系统一、命名规范统一
- **明确三 Skill 的协作关系**：决策树、调用链路、信息传递格式
- **清理冗余内容**：移除三个 Skill 间重复的 URL 表、登录流程、命名规范等公共内容，收拢到各自最合适的 Skill 中

## Impact
- Affected specs: N/A（首次 Skill 体系重构）
- Affected code/files:
  - `.trae/skills/akso-gmp/SKILL.md` — 大改
  - `.trae/skills/akso-basic-config/SKILL.md` — 中改
  - `.trae/skills/akso-basic-config-api/SKILL.md` — 中改
  - `.trae/skills/akso-gmp/playbooks/` — 新增工程化模板
  - `external_reference_resources/` — 作为标准模板的参考依据

---

## ADDED Requirements

### Requirement: Skill 三层架构
系统 SHALL 将三个 Skill 组织为「编排层 → 执行层 → 复用层」三层架构：

- **编排层 (akso-gmp)**：负责配置前分析、流程编排、质量检查、工程化资源管理
- **执行层 (akso-basic-config + akso-basic-config-api)**：负责具体的 DOM/API 配置操作
- **复用层 (Playbooks + 配置蓝图)**：负责可复用的配置模板和模块定义

#### Scenario: Agent 接到新模块配置任务
- **GIVEN** 用户要求「按 CAPA 模块的配置方式配置一个偏差模块」
- **WHEN** Agent 启动 akso-gmp Skill
- **THEN** Agent 先完成配置前分析（对象清单、字段表、生命周期图、权限矩阵），输出配置蓝图
- **AND** Agent 根据配置蓝图选择执行层 Skill（DOM 或 API 模式）执行具体操作
- **AND** Agent 完成后将新模块归档为可复用的 Playbook

### Requirement: 配置蓝图标准格式
系统 SHALL 提供「配置蓝图」标准格式模板，用于配置前的系统化分析。蓝图应包含：

- 对象清单表（名称、编码、类型、生命周期标记、电子签名标记）
- 每个对象的字段定义表（名称、编码、类型、必填、说明）
- 生命周期状态图（状态节点 + 流转规则 + 权限）
- 菜单结构图
- 编号规则汇总表
- 权限矩阵
- 对象关系 ER 图

#### Scenario: 配置前输出蓝图
- **GIVEN** 用户提供了一个新模块的业务需求
- **WHEN** Agent 使用 akso-gmp Skill 进行需求分析
- **THEN** Agent 输出符合标准格式的配置蓝图文档（参照 `AKSO_API_LIFECYCLE_CONFIG.md` 结构）
- **AND** 蓝图可作为后续 Playbook 的基础

### Requirement: Skill 内容格式统一规范
三个 Skill 的 SKILL.md 文件 SHALL 遵循统一的内容格式：

- YAML front-matter 包含：name、display_name、description、description_zh、version、allowed-tools、agent_created、skill_role（新增，取值为 orchestrator | executor_dom | executor_api）
- 正文采用统一的 Markdown 章节编号体系（零、一、二……）
- Skill 间公共内容（URL 表、登录流程、命名规范）各 Skill 按需保留自身必须的部分，不再大段复制

#### Scenario: 新增一名开发者阅读 Skill
- **GIVEN** 新开发者需要了解 Skill 体系
- **WHEN** 阅读任意一个 Skill 的 SKILL.md
- **THEN** 能看到统一的 front-matter 格式和章节结构
- **AND** 能通过 skill_role 字段快速理解该 Skill 在体系中的角色

### Requirement: 执行层覆盖范围补齐 — 生命周期
akso-basic-config 和 akso-basic-config-api SHALL 覆盖生命周期的完整配置链路：

- 创建生命周期状态（已有）
- 创建状态之间的流转连线（新增）
- 为状态添加用户动作（新增）
- 创建生命周期阶段组（新增）
- 设置状态进入条件/动作（新增）

#### Scenario: 配置完整的生命周期
- **GIVEN** 已创建对象并启用生命周期，已创建多个状态节点
- **WHEN** Agent 继续配置状态流转
- **THEN** Agent 能通过 DOM 或 API 完成状态连线、用户动作添加、阶段组创建
- **AND** 不再需要在创建状态后中断、等待人工补全

### Requirement: 执行层覆盖范围补齐 — 工作流
akso-basic-config 和 akso-basic-config-api SHALL 覆盖工作流的完整创建链路：

- 创建工作流定义（DOM 已有概要、API 待补充）
- 添加参与者节点、任务节点、判断节点、通知节点
- 配置电子签名节点
- 连接节点形成完整流程
- 保存并激活工作流

#### Scenario: 创建一个审批工作流
- **GIVEN** 对象已创建且生命周期配置完成
- **WHEN** Agent 需要为「提交」动作配置审批流程
- **THEN** Agent 能完成工作流创建的完整链路
- **AND** 审批人、通知方式、签名节点均可配置

### Requirement: 执行层覆盖范围补齐 — 菜单与权限
akso-basic-config 和 akso-basic-config-api SHALL 覆盖菜单和权限的配置：

- 创建菜单项并关联对象/布局（DOM 已有概要、API 待补充）
- 创建权限集（新增）
- 配置对象级权限（新增）
- 配置字段级安全（新增）

### Requirement: 三 Skill 协作调用规范
系统 SHALL 定义三 Skill 之间的调用关系和信息传递格式：

- akso-gmp 输出配置蓝图（Markdown 格式，含结构化表格）→ 传递给执行层 Skill
- 执行层 Skill 按蓝图中的对象/字段/生命周期定义逐项执行，返回执行结果摘要
- akso-gmp 汇总执行结果，进行质量检查
- 成功后 akso-gmp 将蓝图 + 执行记录归档为 Playbook

#### Scenario: 跨 Skill 协作完成一个完整配置
- **GIVEN** 用户要求完成一个模块的完整配置
- **WHEN** akso-gmp 完成分析并输出蓝图，将蓝图传递给 akso-basic-config-api
- **THEN** akso-basic-config-api 按蓝图的字段表逐项创建，完成后返回执行摘要
- **AND** akso-gmp 检查摘要与实际配置的一致性

---

## MODIFIED Requirements

### Requirement: akso-gmp 职责重新定义（原：全栈配置 Agent）
**Before**: akso-gmp 承担「学习 + 配置 + 演示」全栈角色，包含了详细的 DOM 定位、浏览器操作、Playwright 命令等底层细节。

**After**: akso-gmp 精简为「编排者」角色：
- 保留：7 阶段配置工作流概览、配置概念（对象/字段/生命周期/工作流）、三种工作模式、质量检查清单
- 新增：配置蓝图标准格式定义、预配置分析流程、工程化资源管理、Skill 编排决策树
- 移除：浏览器操作规范（归入 DOM 版 Skill）、URL 直达表详情（各执行 Skill 自有）、登录页 DOM 精确定位（归入 DOM 版 Skill）、命名规范速查表完整版（各执行 Skill 自有）
- 保留精简版：URL 模块索引（仅一级路径）、核心命名前缀表（仅前缀含义）

### Requirement: akso-basic-config 内容重构（原：DOM 执行指令集）
**Before**: v4.2 版本，覆盖登录/对象/字段/选项集/表单/列表/生命周期/工作流/菜单，格式为「指令 X.Y.Z — 操作描述」。

**After**: 统一为结构化指令表格式，每项操作拆分为「目标 → 前置条件 → 定位 → 操作 → 验证」五要素。与 API 版 Skill 采用一致的章节编号体系。

### Requirement: akso-basic-config-api 内容重构（原：API 直调版）
**Before**: v0.2.1，覆盖 7 模块/12 API，格式为 API 参考手册风格。

**After**: 与 DOM 版对齐章节编号，新增待探索 API 的路标。执行策略表扩展，标记每个配置项在 DOM/API 两种模式下的成熟度。

---

## REMOVED Requirements

### Requirement: akso-gmp 中的系统信息硬编码
**Reason**: 学习环境账号/密码硬编码在 Skill 中违反安全红线。
**Migration**: 系统信息统一通过外部 `AksoGMP_配置环境清单.xlsx` 获取，Skill 中仅保留环境名称和用途描述，不保留密码。登录流程归入执行层 Skill。

### Requirement: Skill 间大段复制的内容
**Reason**: 三个 Skill 的 SKILL.md 中存在大段重复内容（URL 表、登录流程、命名规范、Ant Select 操作技巧），维护成本高且容易不一致。
**Migration**: 每个 Skill 仅保留自身职责所需的最小内容集。URL 表在各执行 Skill 中各自维护（因 DOM/API 模式需要的 URL 不同），命名规范在各执行 Skill 中按需保留，akso-gmp 仅保留前缀速查。
