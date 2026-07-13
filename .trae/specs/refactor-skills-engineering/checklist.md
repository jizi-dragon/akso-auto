# Checklist

## 架构一致性
- [x] akso-gmp SKILL.md 包含 `skill_role: orchestrator`
- [x] akso-basic-config SKILL.md 包含 `skill_role: executor_dom`
- [x] akso-basic-config-api SKILL.md 包含 `skill_role: executor_api`
- [x] 三个 Skill 的 YAML front-matter 字段集合一致（至少包含 name、display_name、description、description_zh、version、allowed-tools、agent_created、skill_role）
- [x] akso-gmp 中不再包含 Playwright 命令、DOM 定位表格等底层执行细节
- [x] akso-gmp 中不再包含密码等硬编码敏感信息
- [x] akso-gmp 中包含三层架构总览和 Skill 编排决策树
- [x] akso-gmp 中包含配置蓝图标准格式定义

## 内容覆盖
- [x] DOM 版 Skill 包含生命周期状态连线的操作步骤
- [x] DOM 版 Skill 包含生命周期用户动作的操作步骤
- [x] DOM 版 Skill 包含生命周期阶段组的操作步骤
- [x] DOM 版 Skill 包含工作流完整创建的操作步骤（参与者/任务/判断/通知/签名/连线/激活）
- [x] DOM 版 Skill 包含菜单和权限配置的操作步骤
- [x] API 版 Skill 的「能力边界」表正确反映新增覆盖范围
- [x] API 版 Skill 的执行策略表中，生命周期状态连线标记了成熟度
- [x] API 版 Skill 的执行策略表中，工作流标记了成熟度（待探索）
- [x] API 版 Skill 的执行策略表中，菜单/权限标记了成熟度（待探索）

## 格式规范
- [x] DOM 版和 API 版的章节编号体系一致（零→快速定位/架构，一→认证/登录，二→对象/选项集，三→选项集/字段…）
- [x] DOM 版的操作步骤统一为「目标 → 前置条件 → 关键定位 → 操作步骤 → 验证方法」五要素结构
- [x] 三个 Skill 之间不再有大段重复的文本内容（URL 表仅在所需 Skill 中出现一次）
- [x] 命名规范在各执行 Skill 中完整保留，akso-gmp 中仅保留前缀速查表

## 工程化资源
- [x] `playbooks/blueprint-template.md` 文件已创建
- [x] 蓝图模板包含对象清单表模板
- [x] 蓝图模板包含字段定义表模板
- [x] 蓝图模板包含生命周期状态图模板（ASCII 格式）
- [x] 蓝图模板包含菜单结构图模板
- [x] 蓝图模板包含编号规则汇总表模板
- [x] 蓝图模板包含权限矩阵模板
- [x] 蓝图模板包含对象关系 ER 图模板
- [x] 蓝图模板引用了 `AKSO_API_LIFECYCLE_CONFIG.md` 作为填写示例

## 安全合规
- [x] akso-gmp 中不再包含任何密码
- [x] akso-gmp 中不再包含任何账号
- [x] 所有 Skill 的环境信息均引用外部 `AksoGMP_配置环境清单.xlsx`
- [x] 无新增 hardcode 敏感信息
