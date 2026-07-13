# DOM/API Skill 9 模块缺口补充 Spec

## Why
经过精确分析，DOM 和 API 两个 Skill 在 9 个核心配置模块中存在覆盖不均问题。其中 7 个模块已基本完备或仅需微调，但 **3 个模块存在严重缺口**：编号规则（两端零覆盖）、生命周期进入动作（两端零覆盖）、工作流与生命周期关联方式（DOM 模糊 API 空白）。此外列表布局和表单布局的 DOM 文档需要补全精确定位。

## What Changes
聚焦以下 5 个缺口点，不做其他扩展：

| 模块 | 缺口 | 补充动作 |
|------|------|----------|
| 编号规则 | DOM ❌ / API ❌ | DOM 新增章节，API 新增探索路标 |
| 生命周期进入动作 | DOM ❌ / API ❌ | DOM 在 7.6 补全，API 新增探索路标 |
| 工作流↔生命周期关联 | DOM ⚠️ / API ❌ | DOM 在 8.2 补全绑定步骤，API 新增探索路标 |
| 列表布局 | DOM ⚠️(缺精确定位) | DOM 第六章升级为五要素 + 精确 DOM 定位 |
| 表单布局 | DOM ⚠️(缺拖拽代码) | DOM 第五章升级为五要素 + 拖拽操作 DSL |

**不涉及**：联动规则、查重规则、验证规则、审批矩阵、对象类型、DAC 等（这些是辅助模块，不在本次 9 模块范围）。

## Impact
- Affected specs: N/A
- Affected code/files:
  - `.trae/skills/akso-basic-config/SKILL.md` — 新增 1 章(编号规则) + 修改 4 处(列表/表单/生命周期/工作流)，v5.0→v5.1
  - `.trae/skills/akso-basic-config-api/SKILL.md` — 新增 4 个探索路标(编号规则/进入动作/工作流关联/列表/表单)，v0.3.1→v0.4.0

---

## ADDED Requirements

### Requirement: DOM Skill — 编号规则配置
系统 SHALL 在 DOM Skill 中新增编号规则章节（插入为新的独立章节，排在第九章之后、原第十章之前，原第十章验证测试后移）。

内容包括（五要素结构）：
- 导航到 `/admin/config/code-rules/list`
- 创建按钮定位 + 表单元素（名称、Code、编号模式、绑定对象、起始值、步长）
- 编号模式语法：PFX('前缀')、DATE(YYYYMM)、SEQ(位数)、TYPE{数字}(引用关联对象编号前缀)等

#### Scenario: 配置自动编号
- **GIVEN** 需要配置形如 `API202607001` 的编号
- **WHEN** Agent 打开编号规则列表，创建规则
- **THEN** 能按文档完成 PFX('API') + DATE(YYYYMM) + SEQ(3) 的配置

### Requirement: DOM Skill — 生命周期进入动作
系统 SHALL 在 DOM Skill 第七章 7.6（进入条件）之后新增 7.7「进入动作」小节（原 7.7 保存激活 → 7.8）。

内容包括（五要素结构）：
- 选择状态 → 属性面板中的「进入动作」区域
- 可配置的自动操作类型：发送通知、更新字段值、创建关联记录、触发 Web 动作
- 操作参数的配置方式

#### Scenario: 进入状态自动发通知
- **GIVEN** 需要"审批通过"状态进入时自动通知申请人
- **WHEN** Agent 打开进入动作配置面板
- **THEN** 能完成"发送通知→选择模板→指定接收人为申请人字段"的配置

### Requirement: DOM Skill — 工作流与生命周期关联
系统 SHALL 在 DOM Skill 第八章 8.2（创建工作流）的步骤 3「设置触发条件」中，补全工作流与生命周期绑定的具体操作。

内容：明确说明工作流通过"触发条件 = 状态变更时，选择对象 + 选择生命周期动作（如'提交'）"来绑定。补全绑定步骤中涉及的 DOM 元素定位（选择对象下拉、选择动作下拉）。

### Requirement: DOM Skill — 列表布局精确化
系统 SHALL 将 DOM Skill 第六章升级为五要素结构 + 精确 DOM 定位：
- 选择显示列：从左侧字段列表拖拽或点击添加 → 具体 Playwright selector
- 排序设置：排序字段 dropdown + 排序方向(升序/降序)的定位
- 设为默认：默认布局 checkbox 定位

### Requirement: DOM Skill — 表单布局精确化
系统 SHALL 将 DOM Skill 第五章升级为五要素结构 + 拖拽 DSL：
- 拖拽字段到画布：给出 `page.dragAndDrop(sourceSelector, targetSelector)` 的 source/target 定位方式
- gridSpan 设置：字段控件上的列宽度下拉定位
- section type 切换：标准分区 / 工作流时间线的切换方式

### Requirement: API Skill — 编号规则探索路标
系统 SHALL 在 API Skill 成熟度表中新增「编号规则」行（❌ 待探索），在待探索清单中新增探索指引：导航到 `/admin/config/code-rules/list`，创建规则时录制 Network POST 请求。

### Requirement: API Skill — 生命周期进入动作探索路标
系统 SHALL 在 API Skill 第七章 7.4「其他生命周期待探索项」表中新增「进入动作配置」行（❌ 待探索）。

### Requirement: API Skill — 工作流关联生命周期探索路标
系统 SHALL 在 API Skill 第八章中明确标注工作流与生命周期绑定 API 为 ❌ 待探索，补充探索步骤：在 DOM Skill 的指导下先完成 DOM 操作，同时录制 Network 请求。

---

## MODIFIED Requirements

### Requirement: DOM 章节编号调整
**Before**: 四→字段、五→表单布局、六→列表布局、七→生命周期、八→工作流、九→菜单与权限、十→验证测试

**After**: 新增「十、编号规则」章节，原十→十一（验证测试）

### Requirement: DOM 生命周期子节重编号
**Before**: 7.6 进入条件 → 7.7 保存激活 → 7.8 完整示例

**After**: 7.6 进入条件 → 7.7 进入动作 → 7.8 保存激活 → 7.9 完整示例

### Requirement: API 成熟度表更新
- 新增行：编号规则（❌ 待探索）
- 生命周期进入动作 行：❌ 待探索（补充说明）
- 工作流关联生命周期 行：❌ 待探索（补充录制步骤）
