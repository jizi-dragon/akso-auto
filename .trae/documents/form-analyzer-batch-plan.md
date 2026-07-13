# form-analyzer 批量导出功能计划

> 目标：支持一次运行导出 1~N 个对象的表单信息，每个对象+布局组合生成一份独立 Excel。

---

## 一、当前状态

| 维度 | 现状 |
|------|------|
| 入口参数 | `process.argv[2]` = 单个对象名 |
| 布局选择 | `AKSO_LAYOUT_NAME` 环境变量 |
| 主流程 | `main()` 登录 → 查一个对象 → 导出 Excel → 退出 |
| 浏览器 | 每次启动/关闭 |

**核心问题**：无法一次运行处理多个对象。

---

## 二、目标行为

### 2.1 单对象模式（向后兼容）

```bash
node tools/form-analyzer/index.js "CAPA"
# → 行为不变：查 CAPA 对象 → 导出 Excel → 退出
```

### 2.2 批量模式（新增）

```bash
node tools/form-analyzer/index.js --batch tasks.json
```

`tasks.json` 格式：

```json
[
  { "object": "CAPA", "layout": "默认布局" },
  { "object": "偏差管理_lyl_aa" },
  { "object": "变更控制", "layout": "默认布局" }
]
```

| 字段 | 必填 | 说明 |
|------|:--:|------|
| `object` | ✅ | 对象中文名称 |
| `layout` | ❌ | 布局名称。省略时：单布局自动选；多布局报错引导补充 |

### 2.3 AI Agent 交互流程

Agent 根据用户需求动态构造 `tasks.json`：

```
用户说: "帮我导出 CAPA 和偏差管理_lyl_aa 的表单"

Agent 分析:
  - 2 个对象，已明确，无需追问
  
Agent 生成 tasks.json:
  [
    { "object": "CAPA", "layout": "默认布局" },
    { "object": "偏差管理_lyl_aa" }
  ]
  
Agent 执行: node tools/form-analyzer/index.js --batch tasks.json
```

```
用户说: "帮我导出一些对象的表单"

Agent 分析:
  - "一些"→ 模糊，需确认
  
Agent 追问:
  "请确认要导出哪些对象：
   1. 对象名称（中文）
   2. 布局名称（单布局对象可省略）
   请逐行列出，完成后回复'确认'"
```

---

## 三、代码变更

### 3.1 文件

`tools/form-analyzer/index.js`

### 3.2 新增函数

| 函数 | 职责 |
|------|------|
| `resolveTasks()` | 替代 `resolveConfig()` 的任务解析入口 |
| `runOneTask(page, task, config)` | 处理单个对象+布局的组合，返回导出的文件路径 |
| `generateExcel(rows, sheetName)` | 从 `assembleRows` 中拆出独立的 Excel 生成逻辑 |

### 3.3 修改函数

| 函数 | 改动 |
|------|------|
| `resolveConfig()` | 拆分为 `resolveEnv()`（只处理环境变量）和 `resolveTasks()`（处理命令行参数+JSON） |
| `main()` | 改为：解析 tasks → 登录一次 → `for task of tasks: runOneTask()` → 输出汇总 → 退出 |
| `selectLayout()` | `process.exit(1)` 改为 `throw new Error()`，由上层 catch 后继续下一个 task |

### 3.4 关键代码结构

```
main()
  ├─ resolveEnv()          // 解析环境变量/交互询问
  ├─ resolveTasks(argv)    // 解析 --batch tasks.json 或单对象名
  ├─ 登录一次
  ├─ for task of tasks:
  │   ├─ runOneTask(page, task, config)
  │   │   ├─ findObject()
  │   │   ├─ getFields()
  │   │   ├─ discoverAndQueryLayouts()
  │   │   ├─ selectLayout()  // 多布局报错 → throw → continue
  │   │   ├─ getLayoutDetail()
  │   │   ├─ assembleRows()
  │   │   └─ generateExcel()
  │   └─ 记录结果 [成功/失败]
  └─ 输出汇总: "完成 3/4 个任务" + 文件列表
```

### 3.5 错误处理

- 单个 task 失败不影响后续 task（`try/catch` 包裹每个 `runOneTask`）
- `selectLayout()` 不再 `process.exit(1)`，改为抛出可捕获的错误
- 最终汇总输出每个 task 的状态

## 四、README 更新

### 4.1 新增章节：批量模式

```markdown
## 批量模式

同时导出多个对象的表单信息：

1. 创建任务清单文件 `tasks.json`：

```json
[
  { "object": "CAPA", "layout": "默认布局" },
  { "object": "偏差管理_lyl_aa" }
]
```

2. 执行：

```bash
node tools/form-analyzer/index.js --batch tasks.json
```

每个 `{object, layout}` 组合生成一份独立 Excel 文件，文件名格式不变。

### AI Agent 批量运行指南

当用户提出模糊需求时，Agent 应主动确认：

```
用户: "帮我导出几个对象的表单"
Agent: "请确认要导出哪些对象（对象名 + 布局名，布局名可省略）："
```

确认后生成 `tasks.json`，通过 `--batch` 参数一次性执行。
```

### 4.2 更新交互指南

原 "AI Agent 交互式运行指南" → 新增步骤 2.5：批量场景处理。

---

## 五、验收标准

1. ✅ 单对象模式向后兼容：`node tools/form-analyzer/index.js "CAPA"` 正常运行
2. ✅ `--batch tasks.json` 批量导出，每个 task 生成独立文件
3. ✅ 登录一次、复用 session
4. ✅ 单个 task 失败不影响后续 task
5. ✅ 最终输出汇总：成功/失败数量 + 文件路径列表
6. ✅ `selectLayout()` 报错被捕获，不会退出进程
7. ✅ README 同步更新（新增批量章节 + Agent 引导指南）
