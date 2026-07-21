# Akso Auto

Akso eGMP 低代码平台自动化工具集。

## 环境要求

- Node.js >= 18
- Playwright Chromium 浏览器

```bash
npm install
npx playwright install chromium
```

## 项目结构

```
├── tools/          # 自动化工具（每工具独立目录）
│   ├── form-analyzer/              # 表单字段分析 & Excel 导出
│   ├── qrs-report-creator/         # 年度质量回顾报告创建（三阶段工作流）
│   ├── akso-gmp/                   # 配置编排工具（需求分析、蓝图生成、质量检查）
│   ├── akso-basic-config/          # 基础配置 DOM 执行工具
│   └── akso-basic-config-api/      # 基础配置 API 直调执行工具
├── shared/         # 跨工具共享模块（浏览器生命周期管理）
├── output/         # 运行时产物（不入 Git）
├── .trae/          # TRAE 规则 & 计划文档
│   ├── rules/      #   项目规范（Agent 自动加载）
│   ├── specs/      #   Spec 驱动开发文档
│   └── documents/  #   计划文档归档
├── test-fixtures/  # 测试用例（.docx 模板文件）
├── external_reference_resources/  # 外部参考文档
├── .env.example    # 环境变量模板
└── package.json    # 公共依赖
```

## 工具列表

| 工具 | 路径 | 用途 |
|------|------|------|
| form-analyzer | `tools/form-analyzer/` | 读取对象表单布局/部分/字段，解析关联对象和选项集，统计输出 Excel |
| qrs-report-creator | `tools/qrs-report-creator/` | 从 .docx 模板提取大纲 → 审批 → 批量创建章节 → 写入 ONLYOFFICE |
| akso-gmp | `tools/akso-gmp/` | 配置编排：需求分析、蓝图生成、流程决策、质量检查、Playbook 管理 |
| akso-basic-config | `tools/akso-basic-config/` | DOM 模式：登录/对象/字段/布局/生命周期/工作流/菜单/权限 |
| akso-basic-config-api | `tools/akso-basic-config-api/` | API 模式：批量对象/字段/布局/生命周期状态创建（比 DOM 快 40x） |

详见各工具目录下的 `README.md`。

## 快速开始

1. 复制 `.env.example` 为 `.env`（或通过环境变量设置）

```bash
cp .env.example .env
# 编辑 .env 填写凭证
```

2. 安装依赖

```bash
npm install
```

3. 按工具 README 运行

```bash
# 表单分析
node tools/form-analyzer/index.js "对象名称"

# 报告创建
node tools/qrs-report-creator/index.js extract --input report.docx

# 配置编排
node tools/akso-gmp/index.js

# DOM 执行
node tools/akso-basic-config/index.js

# API 执行
node tools/akso-basic-config-api/index.js
```

## 安全

- 所有凭证通过环境变量或交互式询问传入，代码中无硬编码
- `output/`、`node_modules/`、`.env` 等敏感目录已加入 `.gitignore`
- 详细规则见 `.trae/rules/project_rules.md`
