# 执行模块化 + 操作健壮性增强 Spec

## Why
本次实操（"今天晚上吃什么"全流程配置）暴露出 5 类结构性缺陷：

1. **登录流程脆弱**：隐私协议弹窗（"已阅读并同意"）在首次登录时必须处理，未处理则 `click "登录"` 被阻塞。当前 login-one-shot.js 未包含此逻辑，反复超时重试耗费大量时间。
2. **弹窗阻断无预判**：名称重复弹窗（"知道了"按钮）、未保存离开确认弹窗（"并不保存"）反复打断自动化流程，每次需额外 snapshot → click → 重试，平均损耗 5-10s。
3. **模糊搜索返回多结果**：系统所有搜索框都是模糊匹配，"晚餐计划"同时匹配"晚餐计划"和"晚餐计划电子签名"。当前代码直接 click 第一个结果，但 nth(0) 可能是子对象/签名对象而非目标对象。
4. **脚本零散不可复用**：本次实操在 `.playwright-cli/` 下临时创建了 30+ 个一次性 JS 文件（`create-fields-5-6-v3.js`、`add-statuses-v2.js` 等），每个文件硬编码了具体参数值，下次换个对象名就无法复用。Skill 的 `scripts/` 目录仅有 6 个基础脚本，缺乏原子化的可复用模块。
5. **复杂模块缺陷明显**：编号规则（编号模式表达式需用 UI 组件逐项添加而非简单 fill）、生命周期（画布拖拽+连线+动作面板）、工作流、表单布局（dragAndDrop 被 Ant Design 拦截）是纯 Playwright 自动化最难攻克的部分，需要用"人带着 AI 收集 DOM/API 信息"的方式逐步攻克。

## What Changes

### 一、登录模块原子化（问题 1）
- 重写 `login-one-shot.js`：整合隐私弹窗处理 → 登录 → 等待落地页三合一
- 新增 `generic-login.js`：参数化版本（account/password 从外部传入），不再 hardcode

### 二、弹窗阻断预判库（问题 2）
- 新增 `popup-handler.js`：预定义 5 种常见弹窗的检测+关闭模板
  - 名称重复弹窗：`button "知道了"`
  - Code 重复弹窗：同上
  - 未保存离开确认：`button "并不保存"` / `button "确 定"`
  - 必填字段校验弹窗：`button "知道了"`
  - beforeunload 浏览器原生弹窗：`dialog-accept`
- 所有原子模块执行前/后自动调用 `dismissAllPopups()` 消除一切阻断

### 三、精确搜索结果匹配（问题 3）
- 新增 `exact-click.js`：封装"模糊搜索 → 读取所有结果 → 逐行精确匹配 → 点击正确行"的完整流程
- 匹配策略：优先 `===` 精确匹配，其次 `includes()` + 排除含"电子签名""子对象"等后缀的结果

### 四、执行脚本模块化（问题 4）
- 在 DOM Skill 的 `scripts/` 下建立原子模块库，每个模块对应一个最小操作单元：

| 模块文件 | 功能 | 入参 |
|----------|------|------|
| `login.js` | 登录+隐私弹窗 | account, password, baseUrl |
| `create-option-set.js` | 创建选项集+批量添加选项 | name, code, options[] |
| `create-object.js` | 创建对象（含生命周期勾选） | name, code, enableLifecycle |
| `create-field.js` | 创建单个字段（含类型切换+选项/对象绑定） | objectId, name, code, dataType, extras |
| `create-fields-batch.js` | 批量创建字段 | objectId, fields[] |
| `create-code-rule.js` | 创建编号规则 | name, code, pattern, objectName |
| `navigate-and-search.js` | 导航到列表页+模糊搜索+精确定位结果 | listUrl, searchKeyword |
| `exact-search-click.js` | 模糊搜索后精确匹配并点击 | searchKeyword, exactName |
| `dismiss-popup.js` | 检测并关闭所有弹窗 | — |

- 每个模块是独立的 `async (page) => { ... }` 函数，通过 `run-code --filename` 调用
- 所有模块**不硬编码业务值**，参数通过外部变量注入

### 五、复杂模块专题攻克计划（问题 5）
编号规则、生命周期、工作流、表单布局 4 个模块单独出方案，采用"你演示 → AI 收集 DOM/API → 生成模块"的协作模式。本次 spec 不包含它们的具体实现，仅建立**探索路标**和**模板占位**。

## Impact
- Affected specs: fill-skill-gaps-comprehensive（表单/列表/工流的部分内容将被此 spec 的新模块覆盖）
- Affected code/files:
  - `.trae/skills/akso-basic-config/scripts/` — 新增 9 个原子模块 + 重写 login-one-shot.js
  - `.trae/skills/akso-basic-config/SKILL.md` — 附录新增「原子模块速查表」

---

## ADDED Requirements

### Requirement: 登录含隐私弹窗处理
系统 SHALL 提供 `login.js` 原子模块，执行：navigate 登录页 → fill 用户名 → fill 密码（穿透 iframe）→ 检测隐私弹窗 → 点击"同 意" → click "登录" → 等待落地页 `/web`。

#### Scenario: 首次登录含隐私弹窗
- **GIVEN** 浏览器首次访问该环境
- **WHEN** Agent 调用 `login.js` with `{ account, password, baseUrl }`
- **THEN** 弹窗被自动关闭，登录成功，页面 URL 包含 `/web`
- **AND** 超时由 30s 缩短到 10s 以内

### Requirement: 弹窗阻断自动清除
系统 SHALL 提供 `dismiss-popup.js` 原子模块，检测页面中是否存在以下弹窗并自动关闭：
- `button "知道了"` — 名称/Code 重复、必填校验
- `button "并不保存"` — 未保存离开确认
- `button "确 定"` — 操作确认
- `button "同 意"` — 隐私协议
- browser beforeunload dialog — `dialog-accept`

#### Scenario: 对象名重复时自动关闭弹窗并触发重试逻辑
- **GIVEN** 创建对象时名称与已有对象冲突
- **WHEN** `create-object.js` 检测到 save 后未跳转详情页
- **THEN** 自动调用 `dismiss-popup.js` 关闭"知道了"弹窗 → 返回上一页 → 提示 Agent 更换名称

### Requirement: 精确搜索后点击匹配
系统 SHALL 提供 `exact-search-click.js` 模块，流程为：
1. fill 搜索框 with keyword
2. press Enter
3. 读取表格中所有行的名称（第一列文本）
4. 精确匹配 `.trim() === exactName`
5. 若精确匹配到 1 行 → click 该行链接
6. 若匹配到 0 行或多行 → 返回错误，建议 Agent 调整关键词

#### Scenario: "晚餐计划" 搜索返回 2 条结果时精确匹配
- **GIVEN** 对象列表中存在"晚餐计划"和"晚餐计划电子签名"
- **WHEN** Agent 搜索 "晚餐计划"
- **THEN** 表格显示 2 行，`exact-search-click.js` 识别到两行的第一列分别为 "晚餐计划" 和 "晚餐计划电子签名"
- **AND** click 精确匹配 "晚餐计划" 的行进入正确对象

### Requirement: 原子模块库建立
系统 SHALL 在 `scripts/` 下建立 9 个原子模块，每个模块：
- 入参通过外部变量注入（不 hardcode 具体值）
- 返回 `{ success: boolean, message: string, data: object }` 标准结果
- 执行前后自动调用弹窗检测

模块清单：

| 序号 | 文件名 | 功能 | 核心入参 |
|------|--------|------|----------|
| 1 | `login.js` | 登录 | account, password, baseUrl |
| 2 | `create-option-set.js` | 创建选项集 | name, code, options[] |
| 3 | `create-object.js` | 创建对象 | name, code, enableLifecycle |
| 4 | `create-field.js` | 创建单个字段 | name, code, dataType, objectName, extras |
| 5 | `navigate-search-click.js` | 导航→搜索→精确点击 | listUrl, keyword, exactName |
| 6 | `dismiss-popup.js` | 弹窗清除 | — |
| 7 | `save-and-verify.js` | 保存+验证跳转 | expectedUrlPattern |
| 8 | `fill-form.js` | 填写表单字段 | fieldsMap: {placeholder→value} |
| 9 | `create-batch.js` | 编排多个模块顺序执行 | moduleSequence[] |

### Requirement: 复杂模块攻克计划占位
系统 SHALL 在 `scripts/` 下建立以下 4 个占位文件（仅含注释说明），后续由人带领逐一收集 DOM/API 信息后补全：

| 占位文件 | 计划攻克模块 | 当前状态 |
|----------|-------------|----------|
| `lifecycle-flow.js` | 生命周期状态连线+用户动作+进入条件 | 🔜 待攻克 |
| `code-rule-editor.js` | 编号规则 UI 组件操作（PFX/DATE/SEQ 逐项添加） | 🔜 待攻克 |
| `workflow-editor.js` | 工作流节点拖拽+连线+保存激活 | 🔜 待攻克 |
| `form-layout-dnd.js` | 表单布局 dragAndDrop + gridSpan + section type | 🔜 待攻克 |

### Requirement: login-one-shot.js 重写
系统 SHALL 重写现有 `login-one-shot.js`，整合隐私弹窗处理逻辑，保持原有"一发入魂"单次调用模式，新增对 `button "同 意"` 的检测。

---

## MODIFIED Requirements

### Requirement: SKILL.md 附录新增原子模块速查表
**Before**: 附录 A/B/C 为命名规范、踩坑经验、检查清单。

**After**: 新增「附录 D：原子模块速查表」，列出 9 个可用模块的文件名、功能、参数、调用示例。

### Requirement: helpers.js 扩充通用函数
**Before**: helpers.js 仅含验证和等待函数。

**After**: 新增 `exactMatchClick(keyword, exactName)`、`dismissAllPopups()` 两个通用函数。
