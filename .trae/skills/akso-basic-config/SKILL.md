---
name: akso-basic-config
display_name: "Akso eGMP 基础配置 — 执行指令集"
description: "Akso eGMP 系统基础配置 Skill — DOM 精确定位版。覆盖创建对象、字段（含完整字段类型矩阵）、选项集、表单布局、列表布局、生命周期、工作流、菜单等全链路基础配置操作，配有 URL 直达表、操作速查、踩坑经验附录。"
description_zh: "Akso eGMP 系统基础配置：创建对象/字段/选项集/布局/生命周期/工作流/菜单的精确 DOM 级操作指令集"
version: 4.2
allowed-tools: Bash, Read, Write, Skill, WebFetch
agent_created: true
---

# Akso eGMP 基础配置 — Agent 执行指令集

> **版本**：v4.2 — 精确定位修正版
> **适用对象**：WorkBuddy AI Agent（非人类阅读教程）  
> **执行入口**：Playwright MCP 或 playwright-cli  
> **原则**：每步一条指令，每条指令有精确的 DOM 定位方式，优先使用 URL 直达；登录/字段创建等重复操作用「一发入魂」模式合并为单次 run_code_unsafe  
> **环境信息**：存储于外部 `AksoGMP_配置环境清单.xlsx`，本 Skill 不含密码/账号

> 📂 **文件结构**：
> ```
> akso-basic-config/
> ├── SKILL.md          ← 你在这里（核心指令集）
> ├── CHANGELOG.md      ← 变更历史
> ├── examples/         ← 实战示例（login / create-object / create-fields / create-option-set）
> └── scripts/          ← 可复用脚本（登录 / 类型选择 / 选项集绑定 / 对象绑定 / 父对象绑定 / 助手函数）
> ```
> Agent 执行时可加载 `scripts/*.js` 中的代码片段直接用于 `browser_run_code_unsafe`，参考 `examples/*.md` 中的完整操作流程。

---

## 零、快速定位指南（先读这里）

### 0.1 URL 直达（最速路径）

> ⚠️ **URL 不可猜测，必须从下表直接取用！** SPA 路由名与实际系统路径不一致。  
> **基础路径**：从 `AksoGMP_配置环境清单.xlsx` 中选定环境的「登录网址」列提取 host（去掉 `/login` 后缀）。  
> **文件位置**：与 Skill 同项目的 `d:/akso/akso_claw/AksoGMP_配置环境清单.xlsx`。

| 目标页面 | 路径 | 用途 |
|----------|------|------|
| 登录页 | `/login` | 入口 |
| 业务首页 | `/web` | 登录后落地 |
| **对象管理 → 对象列表** | `/admin/config/basic-objects/list` | 创建/编辑对象 |
| **对象管理 → 选项集列表** | `/admin/config/pick-list/list` | 创建/编辑选项集 |
| **对象管理 → 编号规则** | `/admin/config/code-rules/list` | 编号规则配置 |
| **对象管理 → 相关记录配置** | `/admin/config/related-record-rule` | 关联记录规则 |
| **对象管理 → 联动规则** | `/admin/config/linkages-rule/list` | 字段联动 |
| **对象管理 → 查重规则** | `/admin/config/recurrence-check/list` | 查重 |
| **业务逻辑 → 对象生命周期** | `/admin/config/lifecycle` | 生命周期配置 |
| **业务逻辑 → 生命周期阶段组** | `/admin/config/stage-group` | 阶段组 |
| **业务逻辑 → 工作流** | `/admin/config/workflow` | 工作流配置 |
| **业务逻辑 → 工作流设置** | `/admin/config/workflow-setting` | 工作流全局设置 |
| **业务逻辑 → 状态类型** | `/admin/config/object-status-type` | 状态类型 |
| **业务逻辑 → 审批矩阵类型** | `/admin/config/approval-matrix/list` | 审批矩阵 |
| **业务逻辑 → Web动作** | `/admin/config/web-action/list` | Web 动作 |
| **用户界面 → 菜单** | `/admin/config/menu-mgmt` | 菜单管理 |
| **用户界面 → 菜单集** | `/admin/config/menu-collection/list` | 菜单集 |
| **用户界面 → 视图** | `/admin/config/view-management` | 视图管理 |
| **用户界面 → 页面链接** | `/admin/config/page-link/list` | 页面链接 |
| **通知设置 → 消息模板** | `/admin/config/notice/list` | 消息模板 |

> **规则 0.1.1 — URL 优先**：凡有上表 URL 的目标页面，**直接 navigate 到 URL**，不要通过点击菜单逐层进入。比菜单导航快 3-5 步。

### 0.2 左侧菜单导航（备选路径）

> 当 URL 不可用时，使用菜单导航。从**管理端**左侧面板定位 `menuitem "名称"`。

| 分组 | 菜单项 (`menuitem`) |
|------|---------------------|
| 文档设置 | 文档类型、文档字段、文档布局、文档关系类型、文档格式副本类型、文档标签、文件编号规则、页面模板包规则设置 |
| 对象管理 | **对象**、**选项集**、编号规则、相关记录配置、联动规则、查重规则 |
| 报表设置 | 报表类型、报表视图 |
| 业务逻辑 | 文档生命周期、**对象生命周期**、生命周期阶段组、**工作流**、工作流设置、状态类型、审批矩阵类型、Web动作 |
| 检查表设置 | 检查表类型 |
| 用户界面 | 页面链接、**菜单**、菜单集、**视图** |
| 通知设置 | 消息模板 |
| SDK | 记录动作 |
| 移动端设置 | 移动端菜单 |

### 0.3 通用操作按钮速查

| 场景 | 定位 |
|------|------|
| 对象列表「创建」按钮 | `button "创 建"`（注意中间有空格） |
| 选项集列表「创建」按钮 | `button "创 建"` |
| 保存按钮 | `button "save 保存"` |
| 返回按钮 | `button "返回"` |
| 字段类型选择 | 点击当前类型文本（如 "文本" span）弹出全量类型面板 |

---

## 一、环境选择与登录

### 1.1 环境清单（外部 Excel 存储）

> **规则 1.1.0 — 环境信息分离存储**：  
> 登录地址、账号、密码等敏感信息**不在本 Skill 中硬编码**，统一存储在外部 Excel 文件：  
> **`d:/akso/akso_claw/AksoGMP_配置环境清单.xlsx`**  
> 
> Excel 列结构：
> 
> | 列 | 字段 | 说明 |
> |----|------|------|
> | A | 配置环境名称 | 用途标识，如「日常学习环境」「客户A生产环境」 |
> | B | 登录网址 | 完整登录页 URL，如 `https://xxx.aksoegmp.com/login` |
> | C | 账号 | 登录用户名 |
> | D | 密码 | 登录密码 |
> | E | 备注 | 补充说明（权限、限制等） |
> 
> Agent 工作流程：
> 1. 执行配置任务前，先用 `Read` 工具读取 `AksoGMP_配置环境清单.xlsx`
> 2. 从「配置环境清单」sheet 中查找匹配的环境（按 A 列「配置环境名称」筛选）
> 3. 从选中行中提取：登录网址（B列）、账号（C列）、密码（D列）
> 4. 以提取的登录网址计算基础路径（去掉 `/login` 后缀），用于拼接 0.1 表中的相对路径
> 5. 以提取的账号和密码完成登录

> **规则 1.1.1 — 未指定环境时必须询问**：  
> 当用户给出的配置指令中**没有明确指定使用哪个环境**时，Agent 必须：  
> 1. 先读取 Excel 文件，列出所有可用环境  
> 2. 请用户选择：  
>    「请确认要使用哪个配置环境？当前已记录的环境有：  
>    ① xxx环境（xxx域名）  
>    ② yyy环境（yyy域名）  请选择序号或直接说环境名称。」

### 1.2 登录流程（DOM 精确定位版）

```
指令 1.2.1 — 打开浏览器并导航
  操作：navigate → URL = 环境对应的登录地址
        或 playwright-cli open <url> --headed

指令 1.2.2 — 填写用户名
  定位：textbox "请输入用户名"
  操作：fill 填入对应用户名

指令 1.2.3 — 填写密码 ⚠️ 需穿透 iframe
  原因：密码输入框在 <iframe> 内，主文档直接定位会失败
  定位方式：
    - Playwright MCP: 先定位 iframe → contentFrame → getByRole('textbox', { name: '请输入密码' })
    - playwright-cli: 需要先 snapshot iframe 内容再操作
  操作：fill 填入对应密码

指令 1.2.4 — 处理隐私声明复选框 ⚠️ 默认可能已勾选
  定位：checkbox "已阅读并同意"
  规则：先检查复选框状态
    - 已勾选 → 跳过此步
    - 未勾选 → click
  原因：部分 Akso 部署环境默认已勾选，click 会反向取消勾选

指令 1.2.5 — 点击登录按钮
  定位：button "登录"
  操作：click

指令 1.2.6 — ⚡ 一发入魂登录（推荐，3 秒内完成）
  适用：当用户名和密码已知时，将全部登录操作合并为单次 browser_run_code_unsafe
  原因：拆分 4 步 MCP 调用（type username → type password → check checkbox → click login）
        每次调用有 ~2-3s 开销，累计 ~15s；合并为 1 次调用只需 ~3s
  
  browser_run_code_unsafe code：
    () => {
      // 1. 填用户名
      page.getByRole('textbox', { name: '请输入用户名' }).fill('用户名');
      // 2. 填密码（iframe 穿透）
      page.frameLocator('iframe').first().getByRole('textbox', { name: '请输入密码' }).fill('密码');
      // 3. 点击登录
      page.getByRole('button', { name: '登录' }).click();
    }
  
  ⚠️ 注意：箭函数内不能使用 await（browser_run_code_unsafe 的代码作为表达式执行）
  此时检查复选框已默认勾选的逻辑可省略（click 登录时服务器端不依赖该复选框状态）
  登录后 navigate 到目标页面即可开始配置任务，无需 snapshot 确认
```


---

## 二、导航到配置管理（URL 优先方案）

### 2.1 直接进入配置页面

```
指令 2.1.1 — 按需选择目标 URL
  根据 0.1 表格选择对应路径，直接 navigate
  示例：
    - 要创建/编辑对象 → navigate: /admin/config/basic-objects/list
    - 要创建/编辑选项集 → navigate: /admin/config/pick-list/list
    - 要配置生命周期 → navigate: /admin/config/lifecycle
    - 要配置工作流 → navigate: /admin/config/workflow
    - 要配置菜单 → navigate: /admin/config/menu-mgmt
```

### 2.2 备选：菜单导航（仅 URL 不可用时）

```
指令 2.2.1 — 点击左侧菜单项
  定位：menuitem "对象"
  操作：click
  效果：进入对象列表页
  注意：必须先通过 1.3 进入管理端，左侧面板才有配置菜单
```

---

## 三、创建选项集（强制前置步骤）

> **规则 3.0.1**：创建任何类型为「选项」的字段前，**必须先执行本章**创建对应的选项集。  
> **规则 3.0.2**：如果用户的需求中包含选项字段，Agent 必须主动检查对应选项集是否已存在，不存在则先创建。

### 3.1 进入选项集列表

```
指令 3.1.1 — URL 直达
  操作：navigate → /admin/config/pick-list/list

指令 3.1.2 — 备选：通过标签切换（如果已在对象管理页面）
  操作：click link "选项集"（对象管理页面的顶部标签栏）
```

### 3.2 创建选项集

```
指令 3.2.1 — 点击创建按钮
  定位：button "创 建"（注意中间空格）
  操作：click

指令 3.2.2 — 填写选项集名称（中文）
  定位：textbox "请输入此字段"（名称输入框）
  操作：fill 填入中文名称
  示例：变更类型、优先级、审批状态、偏差分类
  注意：名称要简洁清晰，准确表达该选项集的业务含义

指令 3.2.3 — 填写选项集 Code（英文）
  定位：textbox "请输入Code"
  操作：fill 填入英文代码
  格式：option_ + PascalCase英文名
  示例：option_ChangeType、option_Priority、option_DeviationCategory
  校验：必须以 option_ 开头、仅含字母数字下划线、长度 ≤ 30

指令 3.2.4 — ⚡ 添加选项值（优先用批量添加）
  推荐方式 — 批量添加：
    定位：button "批量添加"（选项集表格下方，"添加选项"按钮右侧）
    操作：click → 弹出批量添加对话框
    对话框中每行一个选项，格式：显示值,存储值（逗号分隔）
    示例输入：
      选项A,option_a
      选项B,option_b
      选项C,option_c
    操作：在文本区域粘贴所有选项 → click "确定"
    优势：一次输入所有选项，比逐行添加快 3-5 倍
  
  备选方式 — 逐行添加（仅 1 个选项时）：
    定位：button "添加选项"
    操作：click → 表格新增一行 → 填写显示值和存储值
    每次添加一行：
      - 显示值 → 用户看到的中文名称（如：主要变更、次要变更）
      - 存储值 → 系统存储的代码（如：Major、Minor）
    规则：至少添加 2 个选项值
    规则：按业务优先级排序（紧急→高→中→低）

指令 3.2.5 — 保存
  定位：button "save 保存"
  操作：click
```

---

## 四、创建对象

### 4.1 进入对象列表

```
指令 4.1.1 — URL 直达（首选）
  操作：navigate → /admin/config/basic-objects/list

指令 4.1.2 — 备选：从对象管理页面点击 "基础对象" 标签
  操作：click link "基础对象"
```

### 4.2 创建对象（DOM 精确定位版）

```
指令 4.2.1 — 点击创建
  定位：button "创 建"
  操作：click
  效果：进入 /admin/config/basic-objects/edit/base

指令 4.2.2 — 填写对象名称（中文）⚠️ 必填
  定位：textbox "请输入此字段"（placeholder: "请输入对象名称"）
  操作：fill 填入中文名称
  示例：变更控制、CAPA管理、偏差管理、培训任务

指令 4.2.3 — 填写对象 Code（英文）⚠️ 必填
  定位：textbox "请输入Code"（后缀显示 __c）
  操作：fill 填入英文代码
  格式：pascalcase，10-30 字符；单词全部使用小写；单词之间用下划线隔开；若单词太长，则用缩写表示；
  示例：change_control、capa、deviation、training_task

指令 4.2.4 — 确认「状态」
  定位：combobox（第一个 combobox，默认"启用"）
  操作：不动，保持默认"启用"

指令 4.2.5 — 确认「来源」
  定位：只读文本 "自定义"
  操作：不动，不可修改

指令 4.2.6 — 确认「对象类别」
  定位：combobox（第二个 combobox，默认"基础"）
  操作：不动，保持默认"基础"

指令 4.2.7 — 填写描述（可选）
  定位：textbox "请输入描述"
  操作：fill 填入描述内容（可选）

指令 4.2.8 — 决定是否启用生命周期（关键决策）
  定位：checkbox "生命周期"
  默认：不勾选
  判断逻辑：
    - 该对象需要状态流转（草稿→提交→审批→关闭）→ 勾选
    - 该对象仅为数据记录（基础数据、配置表）→ 不勾选（默认）
  ⚠️ 警告：一旦保存，此设置不可修改
  建议：不确定时勾选，后续可停用不用

指令 4.2.9 — 其他复选框（按需处理）
  定位方式均为 checkbox "名称"，默认均不勾选：
    - checkbox "是否大容量" → 默认不勾选
    - checkbox "启用电子签名" → 默认不勾选
    - checkbox "启用审计追踪" → 默认不勾选
    - checkbox "启用对象类型" → 默认不勾选
    - checkbox "开启动态权限控制" → 默认不勾选
    - checkbox "启用实例锁定" → 默认不勾选
  规则：除 "启用审计追踪" 默认已开启外，其余按需求勾选

指令 4.2.10 — 保存对象 ⚠️ 勾选「生命周期」后需额外等待
  定位：button "save 保存"
  操作：click
  效果：进入对象详情页（URL 带 ?id=...）
  
  ⚠️ 等待规则 — 若勾选了「生命周期」：
    原因：系统后台需要创建生命周期定义和相关元数据，服务端处理耗时 5-10s
    表现：保存按钮变为 "loading 保存"，页面可能跳回对象列表（正常行为）
    操作：click 保存后 → wait 10s → 验证页面 URL
      - URL 变为 /admin/config/basic-objects/list → 保存成功（系统跳回列表）
      - URL 带 ?id= 且仍在 edit/base → 保存成功（留在详情页）
      - URL 仍在 edit/base 且无 ?id= → 可能仍在 loading，再等 5s
      - 出现"loading 保存"按钮超过 20s → 检查是否有必填项未填
  
  若未勾选「生命周期」：
    正常保存，约 1-2s 后跳转到对象详情页（URL 带 ?id=...）
```

---

## 五、创建字段

### 5.1 进入字段管理

```
指令 5.1.1 — 点击字段标签
  定位：listitem "字段"（对象详情页顶部 <li> 标签栏，非 <a> 链接）
  操作：click
  实现：page.locator('li').filter({ hasText: /^字段$/ }).first().click()
  ⚠️ 注意：该标签是 <li> 元素，用 role='link' 会定位失败
```

### 5.2 字段类型全表（快速决策用）

> **逐字段类型列出涉及的元素。** ✓ = 该类型有此元素，— = 无。

| 元素 | 文本 | 长文本 | 富文本 | 数字 | 布尔 | ⚠️选项 | 日期 | 日期时间 | 查找 | ⚠️对象 | ⚠️父对象 | 附件 | ⚠️对象多选 |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `textbox "请输入名称"` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `textbox "请输入Code"` + `__c` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **必填** (checkbox) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | ✓ |
| 在默认列表和悬浮卡中显示 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 设置格式 (textbox) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| 最大长度 (textbox) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| 格式 (combobox) | — | — | — | ✓ | — | — | ✓ | ✓ | — | — | — | — | — |
| 数值最大值 | — | — | — | ✓ | — | — | — | — | — | — | — | — | — |
| 最小值 | — | — | — | ✓ | — | — | — | — | — | — | — | — | — |
| 小数位数 | — | — | — | ✓ | — | — | — | — | — | — | — | — | — |
| ⚠️ ***选项** (combobox 可搜索) | — | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| **允许多选** | — | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| **显示为复选框** | — | — | — | — | ✓ | — | — | — | — | — | — | — | — |
| ⚠️ ***对象** (combobox 可搜索) | — | — | — | — | — | — | — | — | — | ✓ | ✓ | — | ✓ |
| ***查找关系** (combobox) | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |
| ***查找源字段** (combobox) | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |
| 附件数量限制 | — | — | — | — | — | — | — | — | — | — | — | ✓ | — |
| 附件大小限制 (M) | — | — | — | — | — | — | — | — | — | — | — | ✓ | — |
| 附件格式限制 (\|分隔) | — | — | — | — | — | — | — | — | — | — | — | ✓ | — |

### 5.3 创建字段的通用流程

```
指令 5.3.1 — 点击创建
  定位：button "创 建"
  操作：click

指令 5.3.2 — 选择字段类型 ⚠️ 点击当前类型文本，弹出全量面板
  说明：字段类型选择器展开后显示所有类型的面板，无需搜索
  定位：当前显示的字段类型文本（如 "文本" 的 span）
  操作：click 该文本 → 全量类型面板弹出

指令 5.3.3 — 从类型面板中 click 目标类型 ⚡ 优化版
  说明：类型面板展示全部类型（文本、长文本、数字、布尔、选项…），直接点选
  
  ⚠️ 核心优化 — 面板元素与当前选中元素 title 重复时的处理：
    问题：getByTitle('数字') 匹配 2 个元素（当前选择 span + 面板 div）
    原因：Ant Select 当前选择值和面板选项都显示为 title 属性
    解决方案（按类型分）：
    
    普通类型（文本/长文本/数字/布尔/日期/日期时间/附件）：
      直接用 getByTitle('类型').first().click() 或 getByText('类型').click()
      不使用 exact: true（与面板选项不冲突）
    
    标题重叠类型（对象/父对象/对象多选）：
      ❌ 已废弃：getByTitle('对象', { exact: true }).click()
         原因：exact: true 无法区分 display span 和 dropdown div（两者 title 完全相同）
         实测：resolved to 2 elements → 仍然 strict mode violation
      ✅ 推荐：page.locator('[title="对象"]').nth(1).click({ force: true })
         nth(0)=当前选中值 span, nth(1)=下拉面板 div
         force: true 绕过下拉面板可能的 visibility 检查问题
      ✅ 备选：page.locator('.ant-select-item-option-content')
               .filter({ hasText: /^对象$/ }).click({ force: true })
         注意：备选方案也可能因元素不可见而超时，优先用推荐方案
    
    标题最明确的类型（如 选项、查找）：
      getByTitle('选项').first().click() 即可
    
  ⚡ 合并优化：将打开面板 + 选择类型合并为 1 次 browser_run_code_unsafe：
    () => {
      page.locator('.ant-select').first().locator('.ant-select-selector').click();
      page.getByTitle('长文本').first().click();  // 普通类型
      // 或重叠类型：page.locator('[title="对象"]').nth(1).click({ force: true });
    }
  注意：合并调用内不能使用 await，且两项操作是先后执行
  注意：若目标类型不在可见区域，可 scroll 面板后 click
  ⚠️ 合并陷阱：字段类型切换后 React 重新渲染，名称/Code 等 textbox 可能短暂不可用。
     合并操作中类型选择 + fill 名称/Code 时，建议类型选择成功后 waitForTimeout(800) 再 fill。

指令 5.3.4 — ⚠️ 区分：可搜索下拉（选项集、对象选择）才用 focus+keyboard.type
  场景：绑定选项集（combobox "*选项"）、绑定关联对象（combobox "*对象"）等
  这些 Ant Select 的 search input 为 readonly，fill() 无效
  正确方式：
    1. 定位 .ant-select-selection-search-input
    2. focus()
    3. keyboard.type("关键字")
    4. 从筛选结果中 click 目标选项
  禁止：使用 fill() 方法，会失败

指令 5.3.5 — 填写字段名称（中文）
  定位：textbox "请输入名称"
  操作：fill 填入中文名称
  格式建议：[字段名]，如 标题、基本信息、申请人

指令 5.3.6 — 填写字段 Code（英文）
  定位：textbox "请输入Code"（后缀 __c）
  操作：fill 填入英文代码
  格式：pascalcase，单词全部使用小写；单词之间用下划线隔开；若单词太长，则用缩写表示；
  示例：change_title、applicant、happen_date

指令 5.3.7 — 设置必填
  定位：checkbox "必填"
  操作：勾选/取消
  规则：核心信息（标题、申请人、日期）必填；备注、附件选填
  ⚠️ 注意：父对象字段无"必填"复选框

指令 5.3.8 — 设置格式（按类型，参考 5.2 表格）
  - 文本字段：设置最大长度（如 100、255），可设置格式（正则掩码）
  - 数字字段：设置小数位数（≤4位）、最大值（≤99999999999999）、最小值（≥-99999999999999）
  - 日期字段：选择格式（年-月-日）
  - 日期时间字段：格式为"年-月-日 时:分:秒"

指令 5.3.9 — 绑定选项集（仅选项字段）⚠️ 强制前置 + 高性能
  前置：选项集必须已在第三章创建，否则无法选择

  定位 combobox（已验证可靠）：
    // 选项字段表单上 .ant-select 顺序：0=字段类型, 1=状态, 2=*选项
    page.locator('.ant-select').nth(2).locator('.ant-select-selector').click()

  输入关键词（用 insertText 而非 keyboard.type / evaluate）：
    await page.keyboard.insertText('选项集名称');  // 一次性粘贴，不逐字触发过滤
    await page.keyboard.press('Enter');
  ⚠️ evaluate + nativeInputValueSetter 对 React 受控组件无效，值会被重置
  ⚠️ keyboard.type() 逐字输入触发 Ant Select 全量过滤，1000+ 条目下卡 >30s
  禁止：此步不要调 snapshot，选项集下拉有 1000+ 条目会超 token

指令 5.3.10 — 绑定关联对象（仅对象/对象多选字段）⚠️ 同上
  定位：.ant-select:nth(2)（字段类型=0, 状态=1, *对象=2）
  输入：keyboard.insertText + Enter
  禁止 snapshot

指令 5.3.10b — ⚠️ 绑定关联对象（仅父对象字段）— 表单布局与对象不同
  关键差异：父对象字段表单的 *对象 选择器布局与普通对象字段不同，
  .ant-select:nth(2) 不是 *对象 选择器，会导致 keyboard.insertText 输入到 Code 框
  
  正确定位（已验证）：
    // 父对象表单中 *对象 的 combobox 有独立 ID（如 #rc_select_63）
    // 使用表单标签 "*对象" 定位：
    1. 先 snapshot 一次获取 *对象 对应 combobox 的 ref
    2. 或使用 snapshot 获取的 ref 直接 click
    3. 或：const ref = page.locator('.ant-form-item')
             .filter({ hasText: '*对象' })
             .locator('.ant-select-selector');
    4. click → insertText → Enter
  
  禁止：对父对象字段使用 .ant-select:nth(2) — 会输错到 Code 框

指令 5.3.10c — ⚠️ 紧急恢复：如果 keyboard.insertText 误输入到 Code 框
  症状：Code 框中出现选项集/对象名称（如 "parent_obj_test日常测试_new"）
       页面显示 "只能是数字字母下划线" 错误提示
  恢复步骤：
    1. 立即用 fill() 重新填写正确的 Code：
       page.getByRole('textbox', { name: '请输入Code' }).fill('正确的code')
    2. 重新定位正确的 *对象 combobox（见 5.3.10b）
    3. 绑定时先确认焦点在正确的输入框（click combobox 后短暂 sleep 100ms）
    4. 再次 insertText + Enter 绑定对象

指令 5.3.11 — 设置允许多选（仅选项字段）
  定位：checkbox "允许多选"
  操作：按需勾选

指令 5.3.12 — 设置附件限制（仅附件字段）
  ⚠️ 附件表单有 2 个 textbox 同名 "请输入此字段"（名称 + 格式限制），fill 时用 placeholder 区分：
    - 名称：getByPlaceholder('请输入名称').fill('xxx')
    - Code：getByRole('textbox', { name: '请输入Code' }).fill('xxx')
  附件限制设置：
    - 附件数量限制 textbox（≤100）
    - 附件大小限制 textbox（M）
    - 附件格式限制 textbox（用 | 分隔，如 pdf|doc|png）
  操作：按需填写

指令 5.3.13 — 保存字段
  定位：button "save 保存"
  操作：click
```

### 5.4 基础配置速查（常用元素汇总）

| 字段类型 | 常用元素 |
|----------|----------|
| 文本 / 长文本 / 富文本 | **名称**、**Code**、**必填** |
| 数字 / 布尔 | **名称**、**Code**、**必填** |
| 日期 / 日期时间 | **名称**、**Code**、**必填** |
| ⚠️ **选项** | **名称**、**Code**、**必填**、⚠️ **\*选项**(combobox 可搜索)、**允许多选** |
| ⚠️ **对象** | **名称**、**Code**、**必填**、⚠️ **\*对象**(combobox 可搜索) |
| ⚠️ **父对象** | **名称**、**Code**、⚠️ **\*对象**(combobox 可搜索，定位方式见 5.3.10b)；**无"必填"复选框** |
| ⚠️ **对象多选** | **名称**、**Code**、**必填**、⚠️ **\*对象**(combobox 可搜索) |
| 附件 | **名称**、**Code**；**无"必填"复选框**；格式限制用 `|` 分隔 |

### 5.5 批量创建字段

```
规则 5.5.1 — 创建顺序
  1. 基础信息字段（标题、编号、申请人、日期）
  2. 业务字段（类型、状态、金额、数量）
  3. 关系字段（关联对象、父对象）
  最后

规则 5.5.2 — 对每个字段，重复执行 5.3.1 ~ 5.3.13
  注意：每创建一个字段后 wait_for snapshot 确保 DOM 更新
```

---

## 六、配置页面布局（表单布局）

### 6.1 进入表单布局

```
指令 6.1.1 — 点击表单布局标签
  定位：link "表单布局"（对象详情页顶部标签栏）
  操作：click
```

### 6.2 创建布局

```
指令 6.2.1 — 点击创建
  定位：button "创 建"
  操作：click

指令 6.2.2 — 填写布局名称
  定位：textbox（名称输入框）
  操作：fill 中文名称
  示例：变更控制主布局、CAPA详情页

指令 6.2.3 — 填写布局 Code
  定位：textbox "请输入Code"
  操作：fill layout_ + 英文名；单词全部使用小写；单词之间用下划线隔开；若单词太长，则用缩写表示；
  示例：layout_change_control_main、layout_capa_detail

指令 6.2.4 — 添加部分（Section）
  操作：click "添加部分" → 填写部分名称和 Code
  部分 Code 格式：part_ + 英文名
  布局建议：
    - 基本信息（part_BasicInfo）：标题、编号、申请人、申请日期
    - 详细信息（part_Details）：描述、说明
    - 分类信息（part_Category）：类型、优先级、状态
    - 关联信息（part_Relations）：关联对象字段
    - 审批信息（part_Approval）：审批相关字段

指令 6.2.5 — 拖拽字段到部分
  操作：从左侧字段面板 drag 字段到画布中对应部分
  规则：必填字段放上部，相关字段放一起

指令 6.2.6 — 保存布局
  定位：button "save 保存"
  操作：click
```

---

## 七、配置列表布局

### 7.1 进入列表布局

```
指令 7.1.1 — 点击列表布局标签
  定位：link "列表布局"（对象详情页顶部标签栏）
  操作：click
```

### 7.2 创建列表布局

```
指令 7.2.1 — 点击创建
  定位：button "创 建"
  操作：click

指令 7.2.2 — 填写布局信息
  定位：textbox 对应输入框
  名称：中文，如 变更列表
  Code：list_ + 英文，如 list_ChangeList

指令 7.2.3 — 选择显示列
  操作：从可用字段中选择需要显示的列
  建议显示列：名称(name__ak)、标题、申请人、申请日期、状态、优先级

指令 7.2.4 — 设置默认排序
  操作：选择排序字段（如创建时间），方向为降序

指令 7.2.5 — 保存
  定位：button "save 保存"
  操作：click
```

---

## 八、配置生命周期

> **前置条件**：对象创建时已勾选 checkbox "生命周期"。如未勾选，跳过本章。
> **URL 直达**：`/admin/config/lifecycle`

### 8.1 进入生命周期

```
指令 8.1.1 — URL 直达
  操作：navigate → /admin/config/lifecycle

指令 8.1.2 — 备选：点击对象详情页的标签
  操作：click link "生命周期"（可能需要先确认标签存在）
```

### 8.2 创建状态

```
指令 8.2.1 — 创建状态节点
  操作：click "创建状态" 或 "+"
  参数：
    - 状态名称：草稿、待提交、审批中、已完成、已关闭
    - 状态 Code：status_ + 英文，如 status_Draft
    - 设为初始状态：有且仅有一个状态需勾选（通常是草稿）
  重复：创建所有业务需要的状态（建议 3-8 个）
```

### 8.3 添加用户动作

```
指令 8.3.1 — 添加动作
  操作：选择某个状态 → click "添加动作"
  参数：
    - 动作名称：提交、审批通过、退回修改
    - 动作 Code：action_ + 英文，如 action_Submit
    - 目标状态：执行此动作后跳转到的状态
  
  示例规则：
    状态"草稿" + 动作"提交" → 目标"待审批"
    状态"待审批" + 动作"审批通过" → 目标"已完成"
    状态"待审批" + 动作"退回" → 目标"草稿"

指令 8.3.2 — 保存生命周期
  定位：button "save 保存"
  操作：click
```

---

## 九、配置工作流

> **URL 直达**：`/admin/config/workflow`

### 9.1 进入工作流

```
指令 9.1.1 — URL 直达
  操作：navigate → /admin/config/workflow
```

### 9.2 创建工作流

```
指令 9.2.1 — 点击创建
  定位：button "创 建"
  操作：click

指令 9.2.2 — 填写信息
  定位：textbox 对应输入框
  名称：变更审批流程
  Code：workflow_ + 英文，如 workflow_ChangeApproval

指令 9.2.3 — 设置触发条件
  操作：选择触发时机（创建时/状态变更时/字段变更时）
  常见：状态变更时触发，指定某个动作（如"提交"）
```

### 9.3 添加流程节点

```
指令 9.3.1 — 从工具栏拖拽节点到画布

  节点类型和配置：
  ┌──────────┬──────────────┬─────────────────────────┐
  │ 节点类型  │ 用途          │ 需配置的参数              │
  ├──────────┼──────────────┼─────────────────────────┤
  │ 参与者    │ 指定审批人    │ 选择角色或具体用户         │
  │ 任务      │ 创建待办      │ 任务标题、内容            │
  │ 判断      │ 条件分支      │ 判断条件（如 金额>10000）  │
  │ 通知      │ 发送消息      │ 通知方式、接收人           │
  │ 电子签名  │ 签名确认      │ 签名节点位置              │
  └──────────┴──────────────┴─────────────────────────┘

指令 9.3.2 — 连接节点
  操作：从节点输出点拖拽连线到下一节点输入点
  规则：形成从开始到结束的完整路径
  注意：判断节点需有"是"和"否"两条分支

指令 9.3.3 — 保存并激活
  定位：button "save 保存"
  操作：click "保存并激活"
```

---

## 十、创建菜单

> **URL 直达**：`/admin/config/menu-mgmt`

### 10.1 进入菜单管理

```
指令 10.1.1 — URL 直达
  操作：navigate → /admin/config/menu-mgmt
```

### 10.2 创建菜单

```
指令 10.2.1 — 选择父菜单并添加
  操作：在菜单树中 click 父菜单（如质量管理）→ click "添加子菜单"

指令 10.2.2 — 填写菜单信息
  菜单名称：变更控制
  菜单类型：对象列表
  关联对象：选择第四章创建的对象
  使用布局：选择第七章创建的列表布局

指令 10.2.3 — 保存
  定位：button "save 保存"
  操作：click
```

---

## 十一、验证测试

```
指令 11.1 — 切换到业务端
  操作：通过 appstore → 选择业务端，或直接 navigate → /web

指令 11.2 — 点击新菜单
  操作：click 新创建的菜单项

指令 11.3 — 新建记录
  定位：button "新建"（或业务端的创建按钮）
  操作：click

指令 11.4 — 填写并保存
  操作：填写必填字段 → click "保存"

指令 11.5 — 走通流程（如有生命周期）
  操作：提交 → 审批，验证状态流转正确
```

---

## 附录 A：命名规范速查（Agent 自动套用）

| 类型 | 前缀 | 示例 |
|------|------|------|
| 选项集 | `option_` | `option_change_type` |
| 布局 | `layout_` | `layout_main_form` |
| 部分 | `part_` | `part_basic_info` |
| 生命周期 | `lifecycle_` | `lifecycle_change` |
| 工作流 | `workflow_` | `workflow_approval` |
| 列表 | `list_` | `list_change_list` |
| 状态 | `status_` | `status_draft` |
| 动作 | `action_` | `action_submit` |
| 报表 | `report_` | `report_capa_summary` |
| 索引 | `es_` | `es_capa_summary` |
| 阶段 | `stage_` | `stage_capa_summary` |

## 附录 B：常见 Agent 操作技巧（踩坑经验）

```
技巧 B.1 — 富文本填值
  禁止使用 innerText 或直接赋值
  必须触发键盘事件，逐字输入
  原因：Vue/React 数据绑定依赖 input 事件，直接赋值不会被框架感知

技巧 B.2 — 下拉框选择后
  必须重新 snapshot 获取更新的元素 refs
  原因：下拉框选择会触发 DOM 变化，旧 ref 可能失效

技巧 B.3 — 等待页面加载
  snapshot 前等待 2 秒或 wait_for "关键文本" 出现
  原因：Akso 页面是 SPA，DOM 异步渲染

技巧 B.4 — 登录态管理
  首次登录后执行 state-save gmp-session
  后续会话用 state-load gmp-session 跳过登录

技巧 B.5 — ⚠️ 密码可能在 iframe 中
  Akso 部分环境的登录页密码输入框嵌套在 <iframe> 内
  主文档直接定位 textbox "请输入密码" 会失败
  必须穿透 iframe 后再定位（见 1.2.3）

技巧 B.6 — ⚠️ 隐私复选框默认可能已勾选
  Akso 部分环境"已阅读并同意"复选框默认已选中
  先检查状态再操作，避免点击后反向取消（见 1.2.4）

技巧 B.7 — ⚠️ Ant Select 两种交互模式
  模式一（字段类型选择）：点击当前显示文本弹出全量面板，直接点选目标，无需 keyboard.type
  模式二（选项集选择、对象选择等）：输入框 readonly，需 focus() + keyboard.type() 输入关键词筛选后再 click
  通用禁止：任何场景都不可用 fill() 操作 Ant Select 组件

技巧 B.8 — URL 优先导航
  凡是有已知 URL 的页面，直接 navigate 到 URL
  比逐层点击菜单快 3-5 步，且不受菜单层级变化影响

技巧 B.9 — ⚠️ snapshot 慎用：已知结构不 snapshot
  snapshot 是发现工具，不是每步的确认工具。原则：
    1. 首次进入新页面 → snapshot 一次了解结构
    2. 后续同类型表单操作 → 复用已知结构，用 role/text selector 直连
    3. 打开大下拉（选项集、对象选择）→ 严禁 snapshot，1000+ 条目会超 125k token
    4. ⚠️ snapshot ref 只在当次 snapshot 有效，页面 navigate 后立即失效
       错误：上次 snapshot 的 ref=e565 → navigate 后点 ref=e565 → 点到别的东西
       正确：navigate 后用 role selector（如 getByRole('button', { name: 'save 保存' })）
  错误的模式（慢）：click → snapshot → 读 ref → click ref
  正确的模式（快）：click → click role/text selector 直连下一目标
  可节省：每步 1-3 秒，大场景省 10+ 秒

技巧 B.10 — 优先用 role/text selector，勿依赖 snapshot ref
  示例对比：
    ❌ snapshot → 找 ref=e601 → click ref=e601
    ✅ page.getByText('文本').click()
    ❌ snapshot → 找 combobox ref → click ref
    ✅ page.locator('.ant-form-item').filter({ hasText: '*选项' })
         .locator('.ant-select-selector').click()

技巧 B.11 — ⚠️ 操作后验证：保存后检查结果
  每次点击保存后，建议快速确认：
    - URL 是否从 edit/field-base 跳回了 edit/fields？（说明保存成功）
    - 必要时 navigate 回列表页 → evaluate 检查目标字段名是否出现
  避免：保存失败 → 误以为成功 → 继续下一步
  ref 仅在 snapshot 之后有效，页面变化即失效

技巧 B.12 — ⚡ 登录「一发入魂」：合并为单次 run_code_unsafe
  ❌ 慢：navigate → type username → type password → click login（4 次 MCP 调用，~15s）
  ✅ 快：navigate → run_code_unsafe{ fill user + fill pass(iframe) + click login }（2 次，~4s）
  code 格式必须用 () => { ... } 箭头函数体，内部不能用 await
  登录后直接 navigate 到目标 URL 开始配置，无需 snapshot 确认（见 1.2.6）

技巧 B.13 — ⚠️ 父对象字段的 *对象 选择器定位陷阱
  父对象字段表单的表单布局与普通对象字段不同：
    - 普通对象字段：.ant-select:nth(2) = *对象 选择器 ✅
    - 父对象字段：.ant-select:nth(2) ≠ *对象 选择器 ❌（会误输到 Code 框）
  原因：父对象表单有「对象类型」选择器插入，打乱了 .ant-select 顺序
  正解：snapshot 一次 → 用 ref click *对象 combobox → insertText → Enter
  如已误输：立即 fill 修复 Code，再重新定位正确选择器（见 5.3.10c）

技巧 B.14 — ⚡ 字段类型选择慢的根因与优化
  慢的原因：
    1. 每次切换类型需要 2 次 MCP 调用（打开面板 + 点击类型）
    2. 标题重叠类型（对象/父对象）需要特殊处理（exact:true 无效，需 nth(1) + force）
    3. 备选方案（ant-select-item-option-content filter）可能因元素不可见超时
  优化方案：
    1. 合并为 1 次 run_code_unsafe：打开面板 + 点击目标类型
    2. 提前预知类型标题规则（见 5.3.3 完整分类表）避免重试
    3. 简单类型（文本/数字/布尔/附件）用 getByTitle('类型').first()
    4. 重叠类型（对象/父对象/对象多选）用 locator('[title="对象"]').nth(1).click({ force: true })
    5. 类型切换后 waitForTimeout(800) 再 fill，避免 React 重渲染导致 textbox 不可用
  可节省：每种字段类型 1-2s，8 个字段省 10-16s

技巧 B.15 — ⚠️ 对象列表中名称前缀相同的对象区分
  问题：表中有"今天晚上吃什么"和"今天晚上吃什么电子签名"（子对象），用 includes() 搜索会匹配两个
  症状：点击后打开了错误的子对象页面（URL 带不同 id）
  判别：进入详情页后检查页面中是否出现"子对象"字样
  解决方案：
    1. 用 getByText('对象名', { exact: true }) 精确匹配 → 返回 N 个匹配
    2. 分析匹配元素标签类型：
       - TD（表格单元格）→ 通常是非链接的文本节点
       - A（链接）→ 对象名称可点击的链接
    3. 点击 A 标签的匹配项（.nth(n)），而非 TD
    示例：
      const matches = page.getByText('今天晚上吃什么', { exact: true });
      // 通常 nth(0)=子对象TD, nth(1)=主对象A链接 → 点击 nth(1)
      const link = matches.nth(1); // A 标签
      await link.click();
  禁止：用 includes() / textContent 模糊搜索后直接 click 行，会误入子对象

技巧 B.16 — ⚡ 字段创建「选型+填名+填码」合并时的 React 重渲染陷阱
  问题：在 1 次 browser_run_code_unsafe 中先切换字段类型再 fill 名称/Code 时，fill 可能超时
  原因：字段类型切换触发 React 重新渲染表单，名称/Code textbox 可能在渲染过程中短暂不可用
  症状：getByPlaceholder('请输入名称') fill 超时 30s
  解决方案：
    1. 类型切换后加 waitForTimeout(800) 等待 React 完成重渲染
    2. 拆分为 2 次调用更稳健：
       调用1：打开面板 + 选型
       调用2：fill 名称 + fill Code + 绑定 + 保存
    3. getByPlaceholder 比 getByRole('textbox', { name: ... }) 更稳定
      （在 Ant Design 表单中，placeholder 始终存在且唯一）
  建议：字段创建时优先用 getByPlaceholder 而非 getByRole textbox
```

## 附录 C：配置顺序检查清单（Agent 自检用）

```
□ 1. 选项集是否已创建？（选项字段的强制前置）
□ 2. 对象是否已创建？是否勾选生命周期？
□ 3. 字段是否已全部创建？Code 是否规范？
□ 4. 表单布局是否已创建？必填字段是否在表单上？
□ 5. 列表布局是否已创建？主要列是否显示？
□ 6. 生命周期状态和动作是否完整？（如启用）
□ 7. 工作流是否已配置并激活？
□ 8. 菜单是否已创建？关联对象和布局是否正确？
□ 9. 验证测试是否通过？
```

---

> **版本**：v4.2 — 精确定位修正版
> **更新日期**：2026-06-17  
> **更新内容（v4.2 — 精确定位修正）**：
> - 🔧 **废弃 exact:true 错误方案**：5.3.3 对象类型选择 `getByTitle('对象', { exact: true })` → `locator('[title="对象"]').nth(1).click({ force: true })`。原因：exact:true 无法区分 display span 和 dropdown div（两者 title 属性完全相同，仍解析到 2 个元素）
> - 🔧 **修复字段标签定位**：5.1.1 `link "字段"` → `listitem "字段"`（实际 DOM 是 `<li>` 而非 `<a>`）
> - 🔧 **增加 React 重渲染警告**：5.3.3 合并优化中类型切换后 waitForTimeout(800) 再 fill，避免 textbox 短暂不可用
> - 📝 **新增 B.15**：对象列表中名称前缀相同对象的区分方法（exact match + 标签类型 TD/A 分析）
> - 📝 **同步修复**：B.14 和 scripts/field-type-select.js 中的 exact:true 错误建议
>
> **往期更新（v4.1 — 性能与容错）**：
> - ⚡ **登录「一发入魂」**：1.2.6 将所有登录操作合并为单次 run_code_unsafe（~3s vs ~15s）
> - ⚡ **选项集批量添加**：3.2.4 优先用「批量添加」按钮一次性输入所有选项，省 3-5 倍时间
> - ⏳ **生命周期等待**：4.2.10 勾选生命周期后 wait 10s，避免误判保存失败
> - 🐛 **父对象 *对象 定位**：5.3.10b 拆分普通对象和父对象的绑定方式，避开 .ant-select:nth(2) 陷阱
> - 🩹 **紧急恢复方案**：5.3.10c 误输入到 Code 框后的快速恢复步骤
> - ⚡ **字段类型选择合并**：5.3.3 将打开面板+点选合并为 1 次调用，附带完整类型分类规则
> - 📝 **新增**：B.12（一发入魂）、B.13（父对象陷阱）、B.14（类型选择优化）
>
> **往期更新（v4.0 — 测试调优）**：
> - ⚡ **性能优化**：字段类型选择直接 click span，全量面板点选，省 2-3 步
> - ⚡ **选项集/对象绑定**：combobox `.ant-select:nth(2)`，输入 `keyboard.insertText()` 一次写入，零 snapshot
> - 🐛 **修复**：`getByTitle('对象')` 模糊匹配 → `{ exact: true }`
> - 🐛 **修复**：附件表单名称框冲突 → `getByPlaceholder`
> - 📝 **新增**：`5.2` 布尔列 "显示为复选框"、`B.9`~`B.11` snapshot/selector/验证原则
