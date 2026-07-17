# QRS 回顾报告创建工具

## 概述

从 `.docx` 年度产品质量回顾报告模板出发，通过**三阶段工作流**完成自动化配置：

```
Step 1: extract  → 提取大纲（含自动审查） → 用户审查 → approve 审批通过
Step 2: create   → 批量创建章节
Step 3: design   → 逐章写入 ONLYOFFICE 编辑器
```

`extract` 阶段内置 **AI 二次审查**，自动检测三类常见问题：
- 误将表格数据 / 次级标题归入一级标题
- 表格文本泄露到正文
- 标题与正文粘连未分行

> ⚠️ **仅支持 `.docx` 格式。** 其他格式（.md / .doc / .pdf / .txt）请先用 Word 另存为 `.docx`。

## 浏览器持久化（CDP 复用）

`create` 和 `design` 阶段需要浏览器操作。为避免反复启动/关闭浏览器：

- **首次** `create` / `design`：启动 Playwright 浏览器（暴露 CDP 端口 9222），登录后执行操作，结束时**不关闭浏览器**，只断开 CDP 连接。CDP 信息记录到 `output/qrs/.qrs-browser.json`
- **后续** `create` / `design`：读取 `.qrs-browser.json`，通过 `connectOverCDP` 直连已有浏览器实例，无需重新登录
- **全部完成后**：执行 `close` 命令关闭浏览器并清理状态文件

```
首次 → launchBrowser(cdpPort:9222) → login → doWork → disconnect (浏览器保持)
后续 → connectOverCDP → doWork → disconnect (浏览器保持)
结束 → close 命令 → closeRemoteBrowser → 清理 .qrs-browser.json
```

## 相关目录

| 目录 | 用途 |
|------|------|
| `test-fixtures/` | 存放测试用例（.docx 文件） |
| `output/qrs/` | QRS 工具运行时产物（大纲文件、状态文件、CDP 状态等） |

## 依赖

| 依赖 | 用途 | 安装方式 |
|------|------|----------|
| Node.js | 主程序运行时 | — |
| Playwright | 浏览器自动化 | `npm install`（项目根已安装） |
| Python 3 | 文档大纲提取（备用） | — |
| python-docx | .docx 解析（备用） | `pip install python-docx` |

## 两步审批流程

```
extract (提取大纲)
  │
  ├─ 生成 完整大纲.txt（三板块：TOC / 子标题结构 / 大纲+文字段落）
  ├─ 创建 .qrs-state.json（标记 approved: false）
  └─ 提示用户审查
        │
        ▼ (用户审查大纲内容)
        │
  approve (标记审批)
  ├─ 更新 .qrs-state.json（approved: true）
  └─ 提示可执行 create / design
        │
        ▼
  create / design (写入系统)
  └─ 全部完成后 → close (关闭浏览器)
```

## 命令行参数速查

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--baseUrl` | 系统地址 | 环境变量 `AKSO_BASE_URL` 或 `https://standard-val.aksoegmp.com` |
| `--username` | 用户名 | 环境变量 `AKSO_USERNAME` |
| `--password` | 密码 | 环境变量 `AKSO_PASSWORD` |
| `--input` | .docx 模板路径（extract） | — |
| `--output` | 大纲输出路径（extract，可选，默认 `大纲_<文档名>.txt`） | — |
| `--outline` | 大纲文件路径（approve/status/create/design） | — |
| `--reportUrl` | 报告模板编辑页 URL（create/design） | — |
| `--chapters` | 要设计的章节编号，逗号分隔 | 全部 |
| `--chapter` | 单个章节编号 | — |

## 子命令

| 命令 | 功能 | 需浏览器 |
|------|------|:------:|
| `extract` | 从 .docx 提取文档大纲（含自动审查） | — |
| `review` | 审查大纲结构质量（独立运行） | — |
| `approve` | 标记大纲已审批 | — |
| `status` | 查看当前审批状态 | — |
| `create` | 批量创建章节目录 | ✅ |
| `design` | 逐章设计内容（写入 ONLYOFFICE） | ✅ |
| `close` | 关闭持久化浏览器，清理 CDP 状态 | ✅ |

## 使用示例

### 完整审批流程

```bash
# Step 1: 提取大纲
node tools/qrs-report-creator/index.js extract \
  --input "2025年回顾报告.docx" \
  --output "完整大纲.txt"

# 输出:
#   章节数: 21
#   ========================================
#     请审查 "完整大纲.txt"，确认无误后执行:
#     node tools/qrs-report-creator/index.js approve --outline "完整大纲.txt"
#   ========================================

# Step 1.5: 查看状态（可选）
node tools/qrs-report-creator/index.js status --outline "完整大纲.txt"

# Step 2: 用户审查大纲文件后，标记审批通过
node tools/qrs-report-creator/index.js approve --outline "完整大纲.txt"

# Step 3: 批量创建章节（首次启动浏览器，记录 CDP）
node tools/qrs-report-creator/index.js create \
  --outline "完整大纲.txt" \
  --reportUrl "https://xxx.aksoegmp.com/web/report2/..."

# Step 4: 逐章设计内容（CDP 复用同一浏览器）
node tools/qrs-report-creator/index.js design \
  --outline "完整大纲.txt" \
  --reportUrl "https://xxx.aksoegmp.com/web/report2/..."

# 仅设计前 3 章
node tools/qrs-report-creator/index.js design \
  --outline "完整大纲.txt" \
  --chapters 1,2,3 \
  --reportUrl "https://xxx.aksoegmp.com/web/report2/..."

# Step 5: 全部完成后关闭浏览器
node tools/qrs-report-creator/index.js close
```

## 文件结构

```
tools/qrs-report-creator/
├── index.js                     # 主入口（CLI 命令分发）
├── README.md                    # 本文件
└── lib/
    ├── extract-outline.py       # Python 文档大纲提取脚本（备用）
    ├── extract-outline.js       # Node.js 文档大纲提取器（首选，含表格/图片检测）
    ├── chapter-automation.js    # 浏览器自动化模块（登录 / 创建 / 设计）
    ├── state-manager.js         # 审批状态管理（.qrs-state.json）
    └── review-outline.js        # AI 二次审查模块（结构质量检测）
```

## 注意事项

- 使用前确保 Python 已安装 `python-docx`：`pip install python-docx`（可选，Node.js 提取器为首选）
- 登录凭证优先使用命令行参数，亦可设置环境变量 `AKSO_USERNAME` / `AKSO_PASSWORD`
- 大纲生成后**必须审查并执行 approve**，否则 create/design 将拒绝执行
- 重新执行 extract 会重置审批状态，需重新 approve
- 附件章节（含"附件""附表"关键词）会自动跳过内容写入
- extract 后可对大纲文件执行质量审查：`node tools/qrs-report-creator/lib/review-outline.js --input 完整大纲.txt`，使用 `--fix` 自动修复部分问题
- **浏览器持久化**：首次 create/design 启动浏览器后，后续操作复用同一实例。全部完成后务必执行 `close` 清理浏览器和状态文件

## 完整大纲.txt 格式说明

`extract` 生成的大纲文件为纯文本，部分行具有特定含义：

| 符号 | 含义 | 是否写入系统 |
|------|------|:------:|
| `====` / `----` | 板块分隔线，仅用于可读性 | ❌ |
| `[TOC 目录]` | 一级章节目录板块标题 | ❌ |
| `[完整子标题结构]` | 完整子标题层级板块标题 | ❌ |
| `[大纲 + 文字段落]` | 正文内容板块标题（design 阶段以此为数据源） | ❌ |
| `--- ChN ---` | 第 N 章分隔标记，用于快速定位 | ❌ |
| `N 标题名`（如 `1 概述`） | 一级章节名称 + 章节标题（TOC 区用于创建，正文区写入设计） | ✅ |
| `N.N 标题名`（如 `2.1 产品情况`） | 子标题（仅存在于正文区，写入设计） | ✅ |
| `　　正文...`（两全角空格缩进） | 正文段落（仅存在于正文区，写入设计） | ✅ |

> **关键约定**：`--- ChN ---` 是机器可读的章节分隔符，工具会自动过滤不会写入系统设计。`design` 阶段写入的内容 = 该章节 `--- ChN ---` 到下一个 `--- Ch(N+1) ---` 之间的所有行（排除纯分隔线和板块标题）。
