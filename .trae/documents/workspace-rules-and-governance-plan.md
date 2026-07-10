# 工作空间防控机制与治理计划

> 目标：建立目录隔离、代码规范、安全防泄露、版本控制四项基础设施，保障后续多工具并行开发不被相互污染。

---

## 一、当前状态诊断

| 问题 | 现状 | 风险 |
|------|------|------|
| 无 `.gitignore` | 缺失 | `node_modules`、`output/*.xlsx`、`.env` 可能被误提交 |
| 无 `.env.example` | 缺失 | 新开发者不知道需要哪些环境变量 |
| 工具平铺在 `scripts/` | 仅含 `analyze-form-fields.js` + README | 工具增多后脚本混在一起，职责不清 |
| `.trae/rules/` 为空 | 空目录 | Agent 缺少项目级行为规范 |
| `output/` 堆积 | 18 个历史 xlsx 文件 | 历史产物混入工作区，Git 噪音 |
| 无 Git 初始化 | 无 `.git` | 无版本历史，无法回滚 |
| 无项目 README | 缺失 | 新开发者不知道项目结构和运行方式 |
| 无 lint 配置 | 缺失 | 代码风格不统一 |

---

## 二、目标目录结构

```
d:\akso\akso-auto/
├── .git/                          # Git 仓库
├── .gitignore                     # 安全防线
├── .env.example                   # 环境变量模板
├── package.json                   # 顶层公共依赖（playwright, xlsx）
├── README.md                      # 项目总体说明
├── .trae/
│   ├── rules/
│   │   └── project_rules.md       # Agent 自动加载的项目规范
│   ├── skills/                    # 不变
│   └── documents/                 # 计划文档归档
├── tools/                         # ★ 新建工具隔离目录
│   └── form-analyzer/             # ★ 表单字段分析工具（从 scripts/ 迁移）
│       ├── index.js               #    主入口
│       └── README.md              #    AI 使用说明
├── output/                        # 运行时产物（.gitignore 排除）
└── scripts/                       # 删除（合并到 tools/）
```

### 变更清单

| 操作 | 源路径 | 目标路径 |
|------|--------|---------|
| 迁移 | `scripts/analyze-form-fields.js` | `tools/form-analyzer/index.js` |
| 迁移 | `scripts/analyze-form-fields.README.md` | `tools/form-analyzer/README.md` |
| 删除 | `scripts/` | — |
| 清理 | `output/*.xlsx` | 删除历史文件 |
| 新建 | — | `.gitignore` |
| 新建 | — | `.env.example` |
| 新建 | — | `.trae/rules/project_rules.md` |
| 新建 | — | `README.md`（项目根） |
| 更新 | `tools/form-analyzer/index.js` | 修复 `OUTPUT_DIR` 路径（`../output` → `../../output`） |

---

## 三、各文件详细设计

### 3.1 `.gitignore`

```
node_modules/
output/
.env
*.log
.DS_Store
Thumbs.db
```

**原则**：
- `output/` 是运行时产物 → 不提交
- `.env` 是本地凭证 → 不提交
- `node_modules/` 是依赖 → 不提交

### 3.2 `.env.example`

```
# Akso 系统地址（必填）
AKSO_BASE_URL=https://xxx.aksoegmp.com

# 登录凭证（必填）
AKSO_USERNAME=your_username
AKSO_PASSWORD=your_password

# 指定表单布局名称（对象有多个布局时必填）
AKSO_LAYOUT_NAME=
```

### 3.3 `.trae/rules/project_rules.md`

Agent 每次启动自动加载的项目规范，内容模板：

```markdown
# Akso Auto 项目规则

## 一、目录隔离原则

- `tools/<tool-name>/` — 每个工具独立子目录
- `output/` — 工具运行时产物（不入 Git）
- `.trae/skills/` — TRAE Skill 定义
- `.trae/documents/` — 计划文档

## 二、工具开发规范

- 每个工具一个子目录，含 `index.js`（入口）+ `README.md`（AI 使用说明）
- 新工具 npm 依赖统一在顶层 `package.json` 管理
- 工具间不得相互引用内部实现，共享代码抽到 `shared/` 目录

## 三、安全红线

- 禁止 hardcode 任何系统地址、账号、密码到代码中
- 凭证通过环境变量传递，未设置时交互式询问
- 运行时产物输出到 `output/`，不污染工具源码目录

## 四、命名规范

- 工具目录名：kebab-case（如 `form-analyzer`）
- 工具入口：`index.js`
- 工具说明：`README.md`
- JS 变量/函数：camelCase
- 环境变量：`AKSO_` 前缀 + UPPER_SNAKE_CASE

## 五、Git 操作规范

- 提交前检查不包含 `.env` 或硬编码密码
- 每次提交附带清晰的 commit message
- 工具改动时同步更新该工具的 README
- 项目结构变更时同步更新根 README
```

### 3.4 根 README.md

```markdown
# Akso Auto

Akso eGMP 低代码平台自动化工具集。

## 环境要求

- Node.js >= 18
- npm install

## 项目结构

├── tools/          # 自动化工具
├── output/         # 运行时产物（不入 Git）
├── .trae/          # TRAE Skills + 规则
└── package.json    # 公共依赖

## 工具列表

| 工具 | 用途 |
|------|------|
| form-analyzer | 读取对象表单布局/部分/字段，统计输出 Excel |

详见各工具自己的 README。

## 快速开始

1. 复制 `.env.example` 为 `.env` 并填写凭证
2. npm install
3. 按工具 README 运行
```

### 3.5 更新 `tools/form-analyzer/index.js`

迁移后修复内部路径引用：
- `OUTPUT_DIR` 从 `path.join(__dirname, '..', 'output')` 改为 `path.join(__dirname, '..', '..', 'output')`
- `README` 中 npm install 路径改为 `../../` 或统一从根运行

---

## 四、GitHub 初始化步骤

1. 初始化本地 Git 仓库
2. 创建 `.gitignore`，首次提交（不含 `output/`、`node_modules/`）
3. 在 GitHub 上创建仓库 `akso-auto`（通过 MCP GitHub API）
4. 推送本地仓库到 GitHub
5. 确认 `.gitignore` 已拦截敏感文件

---

## 五、验收标准

1. ✅ `.gitignore` 存在且覆盖 `node_modules/`、`output/`、`.env`、`*.log`
2. ✅ `.env.example` 模板存在
3. ✅ `tools/form-analyzer/` 目录正常工作（运行 `node tools/form-analyzer/index.js "CAPA"` 成功）
4. ✅ `.trae/rules/project_rules.md` 被创建
5. ✅ 根 `README.md` 存在
6. ✅ 无 `scripts/` 残留
7. ✅ `output/` 历史文件已清理
8. ✅ Git 仓库已创建并推送到 GitHub
9. ✅ `git status` 无敏感文件
