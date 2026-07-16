# QRS 回顾报告创建工具

## 概述

从 `.docx` 年度产品质量回顾报告模板出发，通过**强制两步审批流程**完成自动化配置：

```
Step 1: extract  → 提取大纲 → 用户审查 → approve 审批通过
Step 2: create   → 批量创建章节
Step 3: design   → 逐章写入 ONLYOFFICE 编辑器
```

> ⚠️ **仅支持 `.docx` 格式。** 其他格式（.md / .doc / .pdf / .txt）请先用 Word 另存为 `.docx`。

## 相关目录

| 目录 | 用途 |
|------|------|
| `test-fixtures/` | 存放测试用例（.docx 文件） |
| `output/qrs/` | QRS 工具运行时产物（大纲文件、状态文件等） |

## 依赖

| 依赖 | 用途 | 安装方式 |
|------|------|----------|
| Node.js | 主程序运行时 | — |
| Playwright | 浏览器自动化 | `npm install`（项目根已安装） |
| Python 3 | 文档大纲提取 | — |
| python-docx | .docx 解析 | `pip install python-docx` |

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
```

## 命令行参数速查

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--baseUrl` | 系统地址 | 环境变量 `AKSO_BASE_URL` 或 `https://standard-val.aksoegmp.com` |
| `--username` | 用户名 | 环境变量 `AKSO_USERNAME` |
| `--password` | 密码 | 环境变量 `AKSO_PASSWORD` |
| `--input` | .docx 模板路径（extract） | — |
| `--output` | 大纲输出路径（extract） | — |
| `--outline` | 大纲文件路径（approve/status/create/design） | — |
| `--reportUrl` | 报告模板编辑页 URL（create/design） | — |
| `--chapters` | 要设计的章节编号，逗号分隔 | 全部 |
| `--chapter` | 单个章节编号 | — |

## 子命令

| 命令 | 功能 | 需浏览器 |
|------|------|:------:|
| `extract` | 从 .docx 提取文档大纲 | — |
| `approve` | 标记大纲已审批 | — |
| `status` | 查看当前审批状态 | — |
| `create` | 批量创建章节目录 | ✅ |
| `design` | 逐章设计内容（写入 ONLYOFFICE） | ✅ |

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

# Step 3: 批量创建章节
node tools/qrs-report-creator/index.js create \
  --outline "完整大纲.txt" \
  --reportUrl "https://xxx.aksoegmp.com/web/report2/..."

# Step 4: 逐章设计内容
node tools/qrs-report-creator/index.js design \
  --outline "完整大纲.txt" \
  --reportUrl "https://xxx.aksoegmp.com/web/report2/..."

# 仅设计前 3 章
node tools/qrs-report-creator/index.js design \
  --outline "完整大纲.txt" \
  --chapters 1,2,3 \
  --reportUrl "https://xxx.aksoegmp.com/web/report2/..."
```

## 文件结构

```
tools/qrs-report-creator/
├── index.js                     # 主入口（CLI 命令分发）
├── README.md                    # 本文件
└── lib/
    ├── extract-outline.py       # Python 文档大纲提取脚本
    ├── chapter-automation.js    # 浏览器自动化模块（登录 / 创建 / 设计）
    └── state-manager.js         # 审批状态管理（.qrs-state.json）
```

## 注意事项

- 使用前确保 Python 已安装 `python-docx`：`pip install python-docx`（可选，Node.js 提取器为首选）
- 登录凭证优先使用命令行参数，亦可设置环境变量 `AKSO_USERNAME` / `AKSO_PASSWORD`
- 大纲生成后**必须审查并执行 approve**，否则 create/design 将拒绝执行
- 重新执行 extract 会重置审批状态，需重新 approve
- 附件章节（含"附件""附表"关键词）会自动跳过内容写入

## 完整大纲.txt 格式说明

`extract` 生成的大纲文件为纯文本，部分行具有特定含义：

| 符号 | 含义 | 是否写入系统 |
|------|------|:------:|
| `====` / `----` | 板块分隔线，仅用于可读性 | ❌ |
| `[TOC 目录]` | 一级章节目录板块标题 | ❌ |
| `[完整子标题结构]` | 完整子标题层级板块标题 | ❌ |
| `[大纲 + 文字段落]` | 正文内容板块标题（设计阶段以此为数据源） | ❌ |
| `--- ChN ---` | 第 N 章分隔标记，用于快速定位 | ❌ |
| `N 标题名`（如 `1 概述`） | 一级章节名称 + 章节标题（TOC 区用于创建，正文区写入设计） | ✅ |
| `N.N 标题名`（如 `2.1 产品情况`） | 子标题（仅存在于正文区，写入设计） | ✅ |
| `　　正文...`（两全角空格缩进） | 正文段落（仅存在于正文区，写入设计） | ✅ |

> **关键约定**：`--- ChN ---` 是机器可读的章节分隔符，工具会自动过滤不会写入系统设计。`design` 阶段写入的内容 = 该章节 `--- ChN ---` 到下一个 `--- Ch(N+1) ---` 之间的所有行（排除纯分隔线）。
