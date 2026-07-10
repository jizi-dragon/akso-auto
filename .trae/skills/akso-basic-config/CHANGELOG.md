# CHANGELOG — akso-basic-config Skill

> 本文件记录 `akso-basic-config` 技能的所有变更历史。
> 格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [4.2] — 2026-06-17 精确定位修正版

### 2026-06-17 — Session 3: 在"今天晚上吃什么"中创建对象类型字段

#### 实战：在"今天晚上吃什么"中创建对象类型字段
- 登录（一发入魂）→ URL 直达对象列表 → 精确定位对象 → 创建对象字段
- 字段：关联日常测试（related_daily_test__c），类型"对象"，绑定"日常测试_new"

#### 本次实战暴露的 3 个 Skill 误导

**误导 1 — 5.1.1「字段」标签的 role 断言错误**
- Skill 写 `link "字段"`，实际 DOM 是 `<li>` 元素（非 `<a>` 链接）
- 导致 `getByRole('link', { name: '字段' })` 超时 30s
- 修复：改为 `listitem "字段"`，给出具体实现 `li.filter({ hasText: /^字段$/ })`

**误导 2 — 5.3.3 / B.14 / field-type-select.js 的 exact:true 断言错误**
- Skill 推荐 `getByTitle('对象', { exact: true }).click()` 选对象类型
- 实测：exact:true 仍解析到 2 个元素（display span + dropdown div，两者 title 都是 "对象"）
- 根本原因：Ant Select 当前选中值的 `<span>` 和下拉面板的 `<div>` 都有相同的 `title` 属性，`exact: true` 只保证精确匹配 title 文本，不能区分 DOM 元素
- 修复：推荐 `locator('[title="对象"]').nth(1).click({ force: true })`（nth(0)=span, nth(1)=div）
- 备选方案 `.ant-select-item-option-content` filter 也可能因"元素不可见"超时

**误导 3 — 对象列表的模糊匹配导致误入子对象**
- 用 `includes('今天晚上吃什么')` 搜索，匹配到 "今天晚上吃什么电子签名"（子对象）
- 修复：新增 B.15，提供 exact match + 标签类型分析（TD vs A）的区分方法

#### 新增
- `B.15` 对象列表中名称前缀相同对象的区分技巧
- `B.16` 字段创建「选型+填名+填码」合并时的 React 重渲染陷阱

#### 修复
- `5.1.1`：link → listitem，附实现代码
- `5.3.3`：废弃 exact:true 推荐，改为 nth(1)+force
- `5.3.3 合并优化`：增加 React 重渲染陷阱警告
- `B.14`：更新重叠类型处理方案
- `scripts/field-type-select.js`：重写重叠类型注释和示例

#### Session 2-1 内容已并入 [4.1] ← 参考下方

#### 实战：对象"测试6月17日"完整配置
- 创建选项集"测试选项_617"（option_test_617__c），含选项A/选项B
- 创建对象"测试6月17日"（test_0617__c），同时勾选生命周期和电子签名
- 创建 8 种字段类型：文本/长文本/数字/布尔/选项/对象/父对象/附件
- 选项字段绑定"测试选项_617"，对象/父对象引用"日常测试_new"

#### 实战发现的问题（5 项）

1. **登录时间太长（~15s）**：4 次独立 MCP 调用开销大
2. **选项集未用批量创建**：逐行添加，效率低
3. **勾选生命周期后无等待**：服务端创建生命周期需 5-10s，未等待导致后续操作失效
4. **父对象字段误输入 Code 框**：`.ant-select:nth(2)` 对父对象无效
5. **字段类型选择慢**：2 次调用 + 标题重叠类型需重试

#### 文件结构丰富

**新增 `examples/` 文件夹**（4 个实战示例）：
- `login.md` — 一发入魂登录全流程
- `create-object-full.md` — 完整创建对象（含生命周期/电子签名）
- `create-all-field-types.md` — 批量创建 8 种字段类型（含父对象特殊处理）
- `create-option-set.md` — 批量创建选项集

**新增 `scripts/` 文件夹**（6 个可复用脚本）：
- `login-one-shot.js` — 一发入魂登录脚本
- `field-type-select.js` — 字段类型选择合并版 + 全类型快速复制模板
- `option-set-bind.js` — 选项集绑定脚本
- `object-bind.js` — 对象绑定脚本（普通对象/对象多选）
- `parent-object-bind.js` — 父对象绑定脚本（含紧急恢复代码）
- `helpers.js` — 通用辅助脚本（验证/等待/输入）

### 2026-06-17 — 测试调优 Session 1

#### 测试步骤
- 创建 CHANGELOG.md 文件，开始记录变更历史
- 启动技能测试与调优流程

#### 测试结果：登录 + 进入配置页面 ✅
- **1.2 登录流程**：全部验证通过
  - `1.2.2` 用户名填写：`textbox "请输入用户名"` 定位正确
  - `1.2.3` 密码填写（iframe 内）：`iframe contentFrame → textbox "请输入密码"` 定位正确
  - `1.2.4` 隐私复选框：默认已勾选，跳过点击，指令正确
  - `1.2.5` 登录按钮：`button "登录"` 定位正确
- **2.1 URL 直达**：`/admin/config/basic-objects/list` 正确进入对象列表页
- **0.2 左侧菜单**：快照中的菜单结构（文档设置、对象管理、报表设置等）与技能附录一致
- **环境清单读取**：Excel 文件 `AksoGMP_配置环境清单.xlsx` 成功读取，环境信息正确

#### 测试结果：字段创建（数字 + 布尔）✅
- **数字字段 "数量" (quantity__c)**：创建成功，小数位数设 0（整数）
- **布尔字段 "是否紧急" (is_urgent__c)**：创建成功
- **字段类型选择差异**：点击 Ant Select 显示值（如 "文本" span）直接弹出完整类型面板，无需 5.3.3 所述的 focus+keyboard.type 方式。该方式适用于可搜索下拉（如选项集选择），但对于字段类型选择，全量面板直接显示
- **布尔字段发现新元素**：布尔类型有 "显示为复选框" checkbox，当前技能 5.2 表格未收录

#### Skill 修复：字段类型选择性能优化
- **问题**：5.3.2 引导 Agent 点击 `button "right 选择字段类型"` 或 combobox 元素，实际操作中该元素被 Ant Select span 遮挡，导致 timeout 重试
- **修复**：
  - `5.3.2` → 改为直接 click 当前类型文本（如 "文本" span），一步弹出全量类型面板
  - `5.3.3` → 从 "keyboard.type 搜索" 改为 "从全量面板点选"，因为字段类型面板显示所有类型无需搜索
  - 新增 `5.3.4` → 将原 keyboard.type 方式保留给可搜索下拉场景（选项集、对象选择）
  - `0.3 速查表` → 更新字段类型选择条目
  - `B.7` → 区分两种 Ant Select 交互模式的注意事项

#### 测试结果：选项字段创建 ✅
- **选项字段 "优先级" (priority__c)**：绑定已有选项集 "优先级"（高/中/低），创建成功
- 选项集 "优先级" 已存在，无需新建，直接复用
- 字段列表：17 → 18 条
- **踩坑**：可搜索下拉（选项集选择）展开后数据量大导致 snapshot 超 token 限制，改用 browser_evaluate + DOM 事件方式完成了选项集绑定

#### Skill 修复：snapshot 性能优化
- **问题**：Agent 在已知 DOM 结构下仍频繁 snapshot，每次 click 后都 snapshot→ref→click，叠加选项集下拉 1000+ 条目导致 125k token 超限
- **修复**：
  - `5.3.9 / 5.3.10` → 选项集/对象绑定改用 role selector + keyboard 流，禁止 snapshot
  - 新增 `B.9` → snapshot 慎用原则：首次进入 snapshot，后续复用已知结构直连
  - 新增 `B.10` → 优先 role/text selector，勿依赖 snapshot ref

#### 测试结果：第二次选项字段创建（偏差来源）— 部分成功，暴露 3 个新错误

**错误总结**：
1. **stale ref**：保存时用旧 snapshot 的 e565，页面已 navigate，点到侧边栏 "移动端菜单"
2. **选项集 combobox 定位失效**：
   - `getByRole('combobox', { name: '*选项' })` → 超时 30s，星号不在 accessible name 中
   - `.ant-select-selector` 无过滤 → 点到了 "状态" combobox 而非 "*选项"
3. **keyboard.type 在大下拉中的性能灾难**：
   - 1000+ 条目的 Ant Select 下拉中逐字输入 → 每字触发全量过滤 → 卡顿 >30s
   - `browser_run_code_unsafe` 返回空 → 误判失败 → 重复创建

**修复**：
- `5.3.9 / 5.3.10` → combobox 定位改用 `.ant-form-item:hasText('*选项') .ant-select-selector`
- `5.3.9` → 输入方式从 keyboard.type 改为 `evaluate` 直接设值 + 派发 input 事件，避免逐字过滤
- `B.9` → 新增第 4 条：snapshot ref 在 navigate 后立即失效
- 新增 `B.11` → 操作后验证：保存后检查 URL 跳转确认结果

#### 测试结果：对象字段创建 ✅
- **对象字段 "关联日常测试" (related_daily_test__c)**：绑定对象 "日常测试_new"，创建成功
- **新发现**：`getByTitle('对象')` 模糊匹配到 "父对象""对象多选"，需 `{ exact: true }`
- **修复**：`5.3.3` 新增 exact match 警告

#### 测试结果：父对象 / 附件字段创建 ✅
- **父对象字段 "父级日常测试" (parent_daily_test__c)**：流程与对象字段一致，无新问题
- **附件字段 "附件" (attachment__c)**：确认附件类型无"必填"选项（符合 5.2 表格）
- **附件表单坑**：`getByRole('textbox', { name: '请输入此字段' })` 匹配到名称+格式限制 2 个元素 → 改用 `getByPlaceholder`
- **修复**：`5.3.12` 新增附件名称输入框 selector 警告

#### Skill 修复：选项集绑定最终方案（session 1 收尾）

**已验证的可靠方案**（经 "紧急程度"/"风险等级" 两次零 snapshot 创建验证）：
- combobox 定位：`.ant-select:nth(2)` — 选项字段表单上顺序固定（0=字段类型, 1=状态, 2=*选项）
- 输入方式：`keyboard.insertText()` — 一次性粘贴，不逐字过滤，不触发 Ant Select 性能瓶颈
- 完整流程：navigate → 1 次 browser_run_code_unsafe（创→选型→填→绑→存）→ evaluate 验证
- 确认 `evaluate + nativeInputValueSetter` 对 React 受控组件无效（值被重置）
- `keyboard.type()` 逐字输入在 1000+ 条目下逐字触发全量过滤，卡 >30s
- `filter({ hasText: '*选项' })` 失败，`*` 在 CSS selector 中为通配符
- `getByRole('combobox', { name: '*选项' })` 失败，星号不在 accessible name 中

---
## [4.1] — 2026-06-17 性能与容错优化版

### Added
- `1.2.6` 一发入魂登录（单次 run_code_unsafe 完成全部登录操作）
- `3.2.4` 批量添加选项（优先用"批量添加"按钮）
- `5.3.10b` 父对象字段的 *对象 选择器定位（与普通对象不同）
- `5.3.10c` 紧急恢复方案（误输入 Code 框后的修复步骤）
- `B.12` 登录一发入魂技巧
- `B.13` 父对象绑定陷阱
- `B.14` 字段类型选择慢的根因与优化
- `examples/` 文件夹（4 个实战示例）
- `scripts/` 文件夹（6 个可复用脚本）
- SKILL.md 文件结构引导

### Changed
- `3.2.4` 选项添加：逐行 → 批量添加优先
- `4.2.10` 保存对象：增加生命周期等待规则（10s wait）
- `5.3.3` 字段类型选择：合并打开面板+点击为 1 次调用，附类型分类规则
- `5.3.10` 拆分：5.3.10（对象/对象多选）+ 5.3.10b（父对象）
- `5.4` 速查表：父对象标注定位引用
- 版本号：4.0 → 4.1

### Fixed
- 登录速度 15s → 3s（合并为 1 次调用）
- 父对象字段 `.ant-select:nth(2)` 陷阱（增加方案 A/B）
- 字段类型选择重试浪费（预知标题规则避免 exact 冲突）

---
## [4.0] — 2026-06-17 测试调优版

### Added
- `B.9` snapshot 慎用 4 条原则（含 navigate 后 ref 失效警告）
- `B.10` 优先 role/text selector 建议
- `B.11` 操作后验证（URL 跳转确认）
- `5.2` 布尔列新增 "显示为复选框" checkbox

### Changed
- `5.3.2` 字段类型选择：click span → 全量面板点选（原 button + keyboard.type）
- `5.3.3` 类型面板直选（原 keyboard.type 搜索）
- `5.3.4`（新）keyboard.type 场景分流到可搜索下拉
- `5.3.9/5.3.10` combobox 定位：`.ant-select:nth(2)` + `keyboard.insertText()`（原 role selector + keyboard.type）
- `5.3.12` 附件表单名称框冲突警告
- `0.3` 速查表 / `B.7` 同步更新

### Fixed
- `getByTitle('对象')` 模糊匹配 → `{ exact: true }`
- Ant Select combobox 定位失败（role selector / CSS hasText 均不可靠）
- React 受控组件 `evaluate+setter` 无效 → 改 `keyboard.insertText`
- 大下拉 keyboard.type 性能灾难 → 改 insertText 一次写入
