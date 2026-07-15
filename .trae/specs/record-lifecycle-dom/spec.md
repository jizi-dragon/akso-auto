# 生命周期状态创建 DOM 记录 Spec

## Why
`akso-basic-config` Skill 第七章「生命周期」存在严重缺陷：
1. **7.2 创建状态** — 错误描述了"画布上 + 按钮"的创建方式，实际 UI 是「状态」section 下的「创建」按钮 + 表单页
2. **缺少生命周期定位** — 未说明如何从 `/admin/config/lifecycle` 列表中找到目标对象的生命周期（命名规则："对象名+生命周期"）
3. **进入条件/进入动作/用户动作** — 当前描述是"点击画布上状态节点→右侧属性面板"，与实际 UI 差异大，且缺乏精确 DOM 定位

本次通过**浏览器实操 + 用户演示**的方式，逐项记录生命周期状态创建全过程（含三个子模块）的 DOM 精确定位，最终升级 SKILL.md 第七章为五要素结构 + DOM 精确定位版。

## What Changes

| 区域 | 改动 | 说明 |
|------|------|------|
| SKILL.md §7.1 | **重写** 进入生命周期 | 补全生命周期列表定位（搜索/精确匹配"对象名+生命周期"→点击进入） |
| SKILL.md §7.2 | **重写** 创建状态 | 替换错误画布描述，改为「状态」section「创建」按钮→表单→保存 |
| SKILL.md §7.3 | 保留但标记待验证 | 状态连线（canvas 操作，暂不修改） |
| SKILL.md §7.4 | **重写** 用户动作 | 改为状态详情页内「用户动作」section +「创建」按钮的 DOM 记录 |
| SKILL.md §7.6 | **重写** 进入条件 | 改为状态详情页内「进入条件」section +「创建」按钮的 DOM 记录 |
| SKILL.md §7.7 | **重写** 进入动作 | 改为状态详情页内「进入动作」section +「创建」按钮的 DOM 记录 |
| SKILL.md §附录B | 新增 | 生命周期模块踩坑经验 |
| SKILL.md 版本 | v5.2→v5.3 | 日期更新 |

## Impact
- Affected specs: fill-skill-gaps-comprehensive（其 Task 4 已标记完成但 DOM 定位不精确）
- Affected code/files:
  - `.trae/skills/akso-basic-config/SKILL.md` — 修改第七章全部 7 个小节

---

## ADDED Requirements

### Requirement: 生命周期列表定位
系统 SHALL 在 DOM Skill 中描述如何从 `/admin/config/lifecycle` 列表中找到目标对象的生命周期条目。

生命周期命名规则：**对象名 + "生命周期"**（如对象名为"晚餐计划"，则生命周期名为"晚餐计划生命周期"）。

#### Scenario: 定位目标对象的生命周期
- **GIVEN** 已创建对象"晚餐计划"并勾选生命周期
- **WHEN** Agent 导航到 `/admin/config/lifecycle`
- **THEN** 能在列表中找到名为"晚餐计划生命周期"的行并点击进入

### Requirement: 生命周期状态创建
系统 SHALL 提供生命周期状态的完整创建流程（DOM 精确定位版），覆盖五要素结构。

#### Scenario: 创建新状态
- **GIVEN** 已进入某个对象生命周期的详情页
- **WHEN** Agent 在"状态"section 中点击"创建"按钮
- **THEN** 能填写状态名称/Code/描述，保存后在状态列表中看到新状态

### Requirement: 进入条件配置
系统 SHALL 在状态详情页中描述"进入条件"section 的创建流程（用户演示，AI 记录 DOM）。

#### Scenario: 为状态添加进入条件
- **GIVEN** 已在某个状态详情页中
- **WHEN** Agent 在"进入条件"section 中点击"创建"
- **THEN** 能按用户演示的方式配置进入条件

### Requirement: 进入动作配置
系统 SHALL 在状态详情页中描述"进入动作"section 的创建流程（用户演示，AI 记录 DOM）。

#### Scenario: 为状态添加进入动作
- **GIVEN** 已在某个状态详情页中
- **WHEN** Agent 在"进入动作"section 中点击"创建"
- **THEN** 能按用户演示的方式配置进入动作

### Requirement: 用户动作配置
系统 SHALL 在状态详情页中描述"用户动作"section 的创建流程（用户演示，AI 记录 DOM）。

#### Scenario: 为状态添加用户动作
- **GIVEN** 已在某个状态详情页中
- **WHEN** Agent 在"用户动作"section 中点击"创建"
- **THEN** 能按用户演示的方式配置用户动作

---

## Execution Approach

采用 **"用户演示 → AI 实时记录 DOM → 复现验证"** 的三阶段协作模式：

1. **阶段 1**：用户在浏览器中逐步操作（生命周期定位→状态创建），AI 通过 Playwright 并行观察 DOM 结构，记录每一步的精确 selector
2. **阶段 2**：用户演示三个复杂子模块（进入条件/进入动作/用户动作），AI 逐一记录 DOM + 表单结构
3. **阶段 3**：AI 基于记录还原 SKILL.md 第七章文档，用户确认后形成 v5.3
