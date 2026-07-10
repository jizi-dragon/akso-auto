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
├── output/         # 运行时产物（不入 Git）
├── .trae/          # TRAE Skills + 规则
│   ├── rules/      #   项目规范（Agent 自动加载）
│   ├── skills/     #   Skill 定义
│   └── documents/  #   计划文档
├── .env.example    # 环境变量模板
└── package.json    # 公共依赖
```

## 工具列表

| 工具 | 路径 | 用途 |
|------|------|------|
| form-analyzer | `tools/form-analyzer/` | 读取对象表单布局/部分/字段，解析关联对象和选项集，统计输出 Excel |

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
node tools/form-analyzer/index.js "对象名称"
```

## 安全

- 所有凭证通过环境变量或交互式询问传入，代码中无硬编码
- `output/`、`node_modules/`、`.env` 等敏感目录已加入 `.gitignore`
- 详细规则见 `.trae/rules/project_rules.md`
