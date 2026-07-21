# 项目结构优化 Spec

## Why
当前 `.trae/skills/` 中的 `akso-gmp`、`akso-basic-config`、`akso-basic-config-api` 本质上都是可独立运行的工具脚本与指令集，放在 Skill 目录下导致三层架构冗余、职责边界模糊、且与实际工具开发规范割裂。同时根目录存在无效的空 `scripts/` 目录。需要将三者统一迁移到 `tools/`，解耦并遵守工具开发规范。

## What Changes
- 将 `akso-gmp`、`akso-basic-config`、`akso-basic-config-api` 全部从 `.trae/skills/` 移动到 `tools/` 并改造为工具格式
- 删除所有原始 Skill 目录（`.trae/skills/akso-gmp/`、`akso-basic-config/`、`akso-basic-config-api/`）
- 清理三个模块之间的耦合关系，确保工具间互不依赖
- 删除根目录空 `scripts/` 目录
- 更新 `project_rules.md`：Skill 数量红线改为 0，三层架构图改为工具协作图，追加"工具变更同步 README"规则
- 同步根 `README.md` 反映新结构

## Impact
- Affected specs: 无（新变更）
- Affected code:
  - `.trae/skills/akso-gmp/` → 移动到 `tools/akso-gmp/`
  - `.trae/skills/akso-basic-config/` → 移动到 `tools/akso-basic-config/`
  - `.trae/skills/akso-basic-config-api/` → 移动到 `tools/akso-basic-config-api/`
  - `.trae/rules/project_rules.md` — 更新 Skill 清单、架构、红线
  - `README.md` — 更新结构说明和工具列表

## ADDED Requirements

### Requirement: 三个 Skill 全部转为独立工具
系统 SHALL 将 `akso-gmp`、`akso-basic-config`、`akso-basic-config-api` 从 `.trae/skills/` 移动到 `tools/` 目录，每个均遵守工具开发规范（index.js + README.md + lib/）。

#### Scenario: 三个工具目录结构正确
- **WHEN** 移动完成后
- **THEN** `tools/akso-gmp/` 包含 `index.js`、`README.md`、`lib/`
- **AND** `tools/akso-basic-config/` 包含 `index.js`、`README.md`、`lib/`
- **AND** `tools/akso-basic-config-api/` 包含 `index.js`、`README.md`、`lib/`
- **AND** 原 `.trae/skills/akso-gmp/`、`akso-basic-config/`、`akso-basic-config-api/` 均已删除

#### Scenario: 工具间互不依赖
- **WHEN** 检查任意两个工具的代码
- **THEN** 不存在跨工具的 `require()` 引用
- **AND** 每个工具仅依赖 `shared/browser-manager.js`、npm 包和自身 `lib/` 模块
- **AND** `akso-gmp` 的 README 中不再使用"Skill"指代另外两个工具

### Requirement: 删除无效 scripts 目录
系统 SHALL 删除根目录下的 `scripts/` 空目录。

#### Scenario: 目录已清理
- **WHEN** 检查项目根目录
- **THEN** `d:\akso\akso-auto\scripts\` 不存在

### Requirement: Skill 清单归零
系统 SHALL 将 `.trae/skills/` 目录清空（或仅保留空目录占位），项目不再维护任何自定义 Skill。

#### Scenario: Skill 目录为空
- **WHEN** 检查 `.trae/skills/`
- **THEN** 不存在任何子目录
- **AND** `project_rules.md` 中 Skill 数量红线改为"固定 0 个"

### Requirement: 工具变更必须同步 README
项目规则 SHALL 要求：对 `tools/` 下任何工具进行代码或结构调整时，必须同步更新该工具的 `README.md`。

#### Scenario: 规则已追加
- **WHEN** 阅读 `project_rules.md`
- **THEN** 工具开发规范中包含"工具变更必须同步 README"条款

### Requirement: 根 README 同步更新
项目根 `README.md` SHALL 反映新的项目结构：工具列表包含 5 个工具、Skill 部分移除。

#### Scenario: README 准确描述当前结构
- **WHEN** 检查 `README.md`
- **THEN** 工具列表列出 `form-analyzer`、`qrs-report-creator`、`akso-gmp`、`akso-basic-config`、`akso-basic-config-api`
- **AND** 移除 Skill 相关说明

## MODIFIED Requirements

### Requirement: 工具协作架构（替代旧三层架构）
三个工具之间的协作关系（仅逻辑层面，非代码依赖）：

```
tools/akso-gmp（编排工具）
  ├── 分析需求、产出配置蓝图
  ├── 决策 DOM/API 执行路径
  └── 质量检查 + 归档 Playbook
        ↓
tools/akso-basic-config（DOM 执行工具）    tools/akso-basic-config-api（API 执行工具）
  ├── 登录 / 可视化验证                     ├── 批量对象/字段/布局创建
  ├── 生命周期复杂操作                       ├── 选项集批量操作
  └── 工作流 / 权限                          └── 状态查询 / 数据验证
        ↓
output/blueprints/（共享产物）
  └── 配置蓝图 + 执行记录
```

核心约束：三个工具之间**无代码级依赖**。协作通过约定格式的配置蓝图文件（Markdown）松耦合。

### Requirement: 工具开发规范（追加）
工具开发规范 SHALL 追加以下条款：
- 对 `tools/` 下任何工具进行代码或结构变更时，必须同步更新该工具的 `README.md`，确保文档与实现一致

### Requirement: 项目规则 SKILL 章节（重写）
五、Skill 清单与职责划分 SHALL 重写为：
- 项目不再维护自定义 Skill
- `.trae/skills/` 目录保留为空
- 原有 Skill 能力已全部迁移到 `tools/` 目录

## REMOVED Requirements

### Requirement: Skill 数量红线
**Reason**：三个 Skill 全部转为工具，不再需要 Skill 数量管控
**Migration**：无

### Requirement: 项目 Skill 清单（5.1）
**Reason**：Skill 全部迁移到 tools，清单无意义
**Migration**：`project_rules.md` 五、章节重写

### Requirement: 三层架构协作关系（5.2）
**Reason**：架构中不再有 Skill 层，改为三个独立工具的松耦合协作
**Migration**：使用"工具协作架构"替代

### Requirement: Skill 数量红线（5.3）
**Reason**：Skill 数量为 0
**Migration**：改为"固定 0 个，不增不减"

### Requirement: Skill 格式规范（5.4）
**Reason**：无 Skill 需要格式规范
**Migration**：移除整个小节
