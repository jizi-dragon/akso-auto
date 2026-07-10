# form-analyzer — AI Agent 使用说明

## 用途

读取 Akso eGMP 系统中指定对象的表单布局、部分和字段信息，统计字段名称、类型，对选项/对象类型字段解析关联名称，输出为 Excel 表格。

## 前置依赖

```bash
cd d:\akso\akso-auto
npm install   # playwright + xlsx
```

## 运行命令

对象名称通过**命令行参数**传入（每次必须指定）。

```bash
node tools/form-analyzer/index.js "<对象中文名称>"
```

### 参数传递方式

| 参数 | 来源 | 说明 |
|------|------|------|
| 对象名称 | 命令行参数（必填） | 第 1 个参数 |
| 系统地址 | `AKSO_BASE_URL` 环境变量 | 未设置时交互式询问 |
| 用户名 | `AKSO_USERNAME` 环境变量 | 未设置时交互式询问 |
| 密码 | `AKSO_PASSWORD` 环境变量 | 未设置时交互式询问 |
| 布局名称 | `AKSO_LAYOUT_NAME` 环境变量 | 多布局时必填 |

### 环境变量一键配置

```bash
$env:AKSO_BASE_URL='https://xxx.aksoegmp.com'
$env:AKSO_USERNAME='your_username'
$env:AKSO_PASSWORD='your_password'
```

### 使用示例

```bash
# 单个布局对象（自动选择唯一布局）
$env:AKSO_BASE_URL='https://xxx.aksoegmp.com'
$env:AKSO_USERNAME='lyl'
$env:AKSO_PASSWORD='888888'
node tools/form-analyzer/index.js "偏差管理_lyl_aa"

# 多个布局对象（必须指定布局名称）
$env:AKSO_LAYOUT_NAME='默认布局'
node tools/form-analyzer/index.js "CAPA"
```

## 输出

- 输出目录: `output/`
- 文件命名: `{对象名}_{时间戳}.xlsx`
- Sheet 名称: 对象名称

### Excel 列结构

| 列 | 说明 |
|----|------|
| 表单名称 | 布局的名称 |
| 部分名称 | Section 名称 |
| 字段名称 | 控件/字段的中文显示名 |
| 字段类型 | 文本/数字/选项/对象/日期/日期时间/富文本/长文本/布尔/附件/父对象/对象多选/查找/公式/对象类型/外部ID/自动编号 |
| 关联对象/选项集 | 对象字段 → 关联对象中文名称（优先取 objectRelation.objectName，降级取 Code）；选项字段 → 选项集名称 |
| 备注 | 选项字段列出所有选项值（用、分隔） |

## AI Agent 交互式运行指南

当用户要求"帮我分析某个对象的表单字段"时，执行以下步骤：

### 步骤 1：确认环境参数

询问用户以下信息（若已通过环境变量配置则跳过）：

```
请确认以下 Akso 系统连接信息:
  - 系统地址（如 https://xxx.aksoegmp.com）
  - 登录用户名
  - 登录密码
```

### 步骤 2：确认对象和布局

询问用户：

```
请确认要分析的对象名称和布局:
  - 对象名称（中文名）
  - 布局名称（若对象只有一个布局则自动选择）
```

### 步骤 3：设置环境变量并执行

```powershell
$env:AKSO_BASE_URL='<用户提供的地址>'
$env:AKSO_USERNAME='<用户提供的账号>'
$env:AKSO_PASSWORD='<用户提供的密码>'
$env:AKSO_LAYOUT_NAME='<用户选择的布局>'
node tools/form-analyzer/index.js "<对象名称>"
```

### 步骤 4：清除凭证

执行完毕后清除环境变量（避免长期保留）：

```powershell
$env:AKSO_BASE_URL=''
$env:AKSO_USERNAME=''
$env:AKSO_PASSWORD=''
$env:AKSO_LAYOUT_NAME=''
```

## 执行流程（自动化内部）

1. **参数解析** — 读取命令行参数 + 环境变量，缺失项交互式询问
2. **登录** — Playwright 打开浏览器，填写 usr/pwd，勾选隐私协议
3. **查找对象** — 导航到对象列表页，用搜索框搜索目标对象（精确匹配）
4. **查询字段** — 调用 `FieldPage` API 获取所有字段（含 dataType、picklist、objectRelation）
5. **查询布局** — 导航到对象详情 → 点击"表单布局"标签 → 捕获 `LayoutList` API
6. **布局详情** — 点击布局进入编辑 → 捕获 `LayoutDetail` API → 提取 sections + controls
7. **数据组装** — 匹配控件名称与字段列表，部分间空行分隔
8. **生成 Excel** — 用 xlsx 包写入 .xlsx 文件

## 降级策略

| 步骤 | 正常路径 | 降级路径 |
|------|---------|---------|
| 查找对象 | 搜索框 + 精确匹配 | 翻页扫描（最多 10 页） |
| 查询布局 | LayoutList API | DOM 提取表格行 |
| 布局详情 | LayoutDetail API | DOM 提取 collapse 面板 |
| 字段关联 | 控件名匹配字段名 | 降级：列出全部字段 |

## 安全设计

- **零硬编码**：脚本不含任何网址、账号、密码
- **按需输入**：每次运行由用户/Agent 提供凭证，用完即清
- **可传播**：脚本可安全分享给其他团队，无需担心泄露
- **多环境支持**：通过环境变量切换不同 Akso 实例

## 已知限制

1. 选项字段的备注列需要 API 返回 `picklist.options`，部分系统内置选项集可能为空
2. 需要 `headless: false`（有头浏览器），因为登录涉及 iframe 和隐私协议交互
3. 多布局对象必须通过 `AKSO_LAYOUT_NAME` 明确指定布局
4. 布局无 Section 时部分名称列留空
5. 布局中 Section/Controls 为空时（新建默认布局），降级输出全部字段
