# 表单字段统计分析脚本 — 实现计划

> 目标：创建一个可复用脚本，读取 Akso eGMP 系统中指定对象的表单布局、部分、字段信息，解析关联对象/选项集，输出为 Excel 表格。

---

## 一、需求摘要

| 维度 | 内容 |
|------|------|
| 输入 | 一个对象名称（中文名或 Code） |
| 输出 | Excel 文件，每个对象一个 Sheet |
| 多表单处理 | 若对象有多个表单布局，脚本主动列出并让用户选择 |
| 环境 | standard-val.aksoegmp.com（日常学习环境） |
| 运行方式 | 可复用 Node.js 脚本 + AI 使用说明 README |

### Excel 列结构

| 列名 | 说明 |
|------|------|
| 表单名称 | 布局的名称 |
| 部分名称 | Section 的名称 |
| 字段名称 | 控件的显示名 |
| 字段类型 | 文本/数字/选项/对象/日期/日期时间/长文本/富文本/布尔/附件/父对象/对象多选/查找/公式 |
| 关联对象/选项集 | 对象类型字段 → 关联对象名；选项类型字段 → 选项集名称 |
| 备注 | 选项字段 → 列出具体选项值；名称含义不清的字段 → 留空提示人工填写 |

---

## 二、当前状态分析

### 已有资产

| 资产 | 位置 | 用途 |
|------|------|------|
| API 助手函数 | `.trae/skills/akso-basic-config-api/scripts/api-helpers.js` | 含 `apiPost`、`getAuthToken`、`queryFields` 等 |
| 登录流程 | `.trae/skills/akso-basic-config/SKILL.md` 1.2 节 | 一发入魂登录代码 |
| 字段类型枚举 | `.trae/skills/akso-basic-config-api/SKILL.md` 2.3.2 节 | dataType → 类型名映射 |
| 表单布局结构 | `.trae/skills/akso-basic-config-api/SKILL.md` 2.5 节 | sections/controls 的 JSON 结构 |

### 已知 API

| API | 用途 | 状态 |
|-----|------|------|
| `FieldPage` | 查询对象的所有字段 | ✅ 已确认 |
| `SaveBasicObject` | 保存对象 | ✅（非本次用） |
| `SaveLayoutDetail` | 保存表单布局 | ✅（非本次用） |
| 对象查询 API | 按名称/Code 查对象 | ❌ 待发现 |
| 布局查询 API | 查询对象的布局列表和详情 | ❌ 待发现 |
| 选项集查询 API | 按 ID 查选项集名称和选项值 | ❌ 待发现 |

### 关键未知项
1. 查询 API 的确切路径和参数（需运行时从网络请求中捕获）
2. 布局详情返回的 JSON 结构（sections/controls 中的字段 ID 映射）
3. 选项集查询返回的 JSON 结构

---

## 三、技术方案

### 整体架构

```
┌─────────────────────────────────────────────────────┐
│  analyze-form-fields.js  (Node.js + Playwright)     │
│                                                      │
│  Phase A: 登录 (DOM 模式, ~3s)                       │
│    └→ browser_run_code_unsafe: fill + click         │
│                                                      │
│  Phase B: API 探索 (~10s)                            │
│    ├→ 导航到对象列表页 → 拦截网络请求 → 发现对象查询API │
│    ├→ 导航到布局详情页 → 拦截网络请求 → 发现布局查询API │
│    └→ 导航到选项集页   → 拦截网络请求 → 发现选项集API  │
│                                                      │
│  Phase C: 数据收集 (API 模式, ~2s/API)               │
│    ├→ 查询目标对象 ID                                 │
│    ├→ 查询该对象的字段列表 (FieldPage)                │
│    ├→ 查询该对象的布局列表                             │
│    ├→ 查询每个布局的 sections + controls              │
│    └→ 解析关联对象名 / 选项集名 + 选项值               │
│                                                      │
│  Phase D: Excel 生成 (~1s)                           │
│    └→ xlsx 包写入 .xlsx 文件                         │
└─────────────────────────────────────────────────────┘
```

### 3.1 登录（复用现有代码）

直接使用 akso-basic-config-api 的登录模式：
- 浏览器打开 → 填用户名 → 穿透 iframe 填密码 → 点击登录
- 登录后从 `document.cookie` 提取 `__auth_token__` 供后续 API 调用

### 3.2 API 发现策略

由于缺乏查询 API 文档，采用**网络请求拦截法**：

```javascript
// 在 page.evaluate 中注入请求拦截器
// 拦截所有 fetch/XHR 请求，记录 URL 和 response
// 然后手动导航到目标页面，触发页面自身的 API 调用
// 从拦截记录中识别出查询 API 的模式
```

具体步骤：
1. 注入请求监听器，劫持 `window.fetch` 和 `XMLHttpRequest`
2. 导航到对象列表页 → 捕获对象列表查询请求
3. 导航到某个对象的布局详情页 → 捕获布局查询请求
4. 导航到选项集列表页 → 捕获选项集查询请求
5. 分析捕获的请求，提取 API 路径和参数格式

### 3.3 数据收集

#### 步骤 1：获取对象 ID
```
通过发现的查询 API，用对象名称/Code 查到 objectId
```

#### 步骤 2：获取字段列表（已知 API）
```
POST /api/platform/BasicObject/FieldPage
→ data.items[]: { id, name, code, dataType, picklistId, referenceObjectId, ... }
```

#### 步骤 3：获取布局列表
```
通过发现的查询 API，获取该对象的所有布局（含 id, name）
若有多个，让用户选择
```

#### 步骤 4：获取布局详情
```
通过发现的查询 API，获取布局的 sections 和 controls
→ sections[]: { id, name, code }
→ controls[]: { sectionId, fieldId, name, type, ... }
```

#### 步骤 5：关联解析
```
对 dataType=4(选项) 的字段 → 用 picklistId 查选项集名称 + 选项值列表
对 dataType=15(对象)/16(父对象)/23(对象多选) → 用 referenceObjectId 查关联对象名称
```

### 3.4 Excel 生成

使用 `xlsx` (SheetJS) 包：
```bash
npm install xlsx
```

关键代码模式：
```javascript
const XLSX = require('xlsx');
const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, '对象名称');
XLSX.writeFile(wb, 'output.xlsx');
```

### 3.5 dataType → 类型名映射

```javascript
const TYPE_MAP = {
  1: '文本', 2: '数字', 3: '布尔', 4: '选项',
  5: '日期', 7: '日期时间', 8: '附件',
  13: '查找', 14: '公式', 15: '对象',
  16: '父对象', 17: '长文本', 18: '富文本',
  23: '对象多选'
};
```

---

## 四、文件结构

```
d:\akso\akso-auto\
├── .trae\
│   └── documents\
│       └── form-field-analysis-plan.md   ← 本计划文档
├── scripts\
│   ├── analyze-form-fields.js            ← 主脚本（新建）
│   └── analyze-form-fields.README.md     ← AI 使用说明（新建）
└── output\                               ← Excel 输出目录（新建）
```

### analyze-form-fields.js 模块划分

| 模块 | 函数 | 职责 |
|------|------|------|
| 认证 | `login(page, config)` | DOM 登录，获取 token |
| API 发现 | `discoverQueryAPIs(page)` | 拦截网络请求，返回 API 路径映射 |
| 对象查询 | `findObject(name)` | 按名称查对象 ID |
| 字段查询 | `getFields(objectId)` | 调用 FieldPage |
| 布局查询 | `getLayouts(objectId)`, `getLayoutDetail(layoutId)` | 查询布局列表和详情 |
| 关联解析 | `resolvePicklist(id)`, `resolveObject(id)` | 解析选项集名/对象名 |
| 数据组装 | `assembleRows(layout, fields, resolved)` | 组装 Excel 行数据 |
| Excel 输出 | `writeExcel(rows, objectName)` | 写入 .xlsx |
| 交互 | `selectLayout(layouts)` | 多布局时让用户选择 |

### analyze-form-fields.README.md 内容要点

面向 AI Agent 的使用说明，包含：
- 脚本用途和输入输出
- 依赖安装命令
- 运行命令示例
- 参数说明（对象名称）
- 已知限制和注意事项
- 输出文件命名规则

---

## 五、执行计划（分步迭代）

### 迭代 1：API 探索（先跑通数据链路）
1. 创建脚本骨架，实现登录模块
2. 实现网络请求拦截器，导航到各页面捕获查询 API
3. 确认所有需要的查询 API 路径和参数格式
4. 输出一份 API 发现报告

### 迭代 2：数据收集
1. 实现对象查询
2. 实现字段列表查询
3. 实现布局查询（含多表单选择交互）
4. 实现关联对象/选项集解析
5. 实现数据组装和终端预览输出

### 迭代 3：Excel 生成
1. 安装 xlsx 依赖
2. 实现 Excel 写入
3. 完整端到端测试

### 迭代 4：README 文档
1. 编写 AI 使用的 README 文件
2. 记录踩坑经验和注意事项

---

## 六、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 查询 API 路径无法通过拦截发现 | 无法使用 API 模式 | 降级为 DOM 模式：navigate 页面后用 `page.evaluate` 提取 DOM 数据 |
| 选项集/对象数量过大导致性能问题 | API 响应慢或超时 | 分页查询，缓存结果 |
| 布局详情 API 返回结构与 Save 不同 | 字段映射错误 | 先打印原始响应，确认结构后再映射 |
| `xlsx` 包不可用 | 无法生成 Excel | 降级为 CSV 输出，或使用 `npm install` 安装 |

---

## 七、验收标准

1. ✅ 脚本能成功登录 standard-val 环境
2. ✅ 能根据对象名称找到对应对象
3. ✅ 能列出该对象的所有表单布局（多个时让用户选择）
4. ✅ 能提取每个布局的部分和字段信息
5. ✅ 选项字段的备注列正确列出选项值
6. ✅ 对象类型字段正确显示关联对象名称
7. ✅ 输出格式规范的 .xlsx 文件
8. ✅ README 文件可供 AI Agent 理解并独立执行
