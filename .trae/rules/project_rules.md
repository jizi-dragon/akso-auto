# Akso Auto 项目规则

## 一、目录隔离原则

- `tools/<tool-name>/` — 每个工具独立子目录，各自含 `index.js`（入口）+ `README.md`（AI 使用说明）
- `output/` — 工具运行时产物（不入 Git，见 `.gitignore`）
- `.trae/skills/` — TRAE Skill 定义，仅 AI Agent 读取
- `.trae/documents/` — 计划文档归档

## 二、工具开发规范

- 每个工具一个子目录，入口文件为 `index.js`
- 新工具 npm 依赖统一在顶层 `package.json` 管理
- 工具间不得相互引用内部实现，共享代码抽到 `shared/` 目录
- 工具要支持通过命令行参数 + 环境变量传入所有配置项

## 三、安全红线

- 禁止 hardcode 任何系统地址、账号、密码到代码中
- 凭证通过环境变量传递，未设置时交互式询问
- 运行时产物输出到 `output/`，不污染工具源码目录
- 每次改动后审查代码中是否有残留的硬编码敏感信息

## 四、命名规范

- 工具目录名：kebab-case（如 `form-analyzer`）
- 工具入口：`index.js`
- 工具说明：`README.md`
- JS 变量/函数：camelCase
- 环境变量：`AKSO_` 前缀 + UPPER_SNAKE_CASE

## 五、Skill 清单与职责划分

> **`.trae/skills/` 目录**：仅存放本项目专属 Skill，当前共 **3 个**。  
> **TRAE 平台内置 Skill**（agent-browser、dynamic-ui、feedback、skill-creator、TRAE-product-knowledge、web-dev 等）不在本目录下，不受本项目管辖。

### 5.1 项目 Skill 清单（仅 3 个）

| 序号 | Skill 名称 | 目录 | 版本 | 角色 | 职责摘要 |
|------|-----------|------|------|------|----------|
| 1 | `akso-gmp` | `akso-gmp/` | 4.0.0 | orchestrator | 配置前分析、流程编排、质量检查、蓝图生成 |
| 2 | `akso-basic-config` | `akso-basic-config/` | 5.0 | executor_dom | DOM 模式：对象/字段/布局/生命周期/工作流/菜单/权限 |
| 3 | `akso-basic-config-api` | `akso-basic-config-api/` | 0.3.0 | executor_api | API 模式：对象/字段/布局/生命周期状态（含待探索 API 路标） |

### 5.2 三层架构协作关系

```
akso-gmp（编排）
  ├── 输出配置蓝图 → 传递给执行层
  ├── 决策 DOM/API 混合模式
  └── 质量检查 + 归档 Playbook
        ↓
akso-basic-config（DOM 执行） ←→ akso-basic-config-api（API 执行）
  ├── 登录 / 可视化验证           ├── 批量对象/字段/布局创建
  ├── 生命周期复杂操作             ├── 选项集批量操作
  └── 工作流 / 权限                └── 状态查询 / 数据验证
        ↓
playbooks/（复用层）
  └── 配置蓝图 + 执行记录 → 可复用的模块 Playbook
```

### 5.3 Skill 数量红线
- **项目 Skill 总数**：固定 3 个，不增不减
- **禁止操作**：不得在 `.trae/skills/` 下创建第 4 个 Skill 目录
- **若确实需要**：应通过重构现有 3 个 Skill 的内容来满足需求，而非增加数量
- **平台内置 Skill**：不受本规则限制，但也不得修改其行为

### 5.4 Skill 格式规范
- 每个 Skill 的 SKILL.md 必须含 YAML front-matter，字段集合：`name`、`display_name`、`description`、`description_zh`、`skill_role`、`version`、`allowed-tools`、`agent_created`
- 正文采用中文编号体系（零、一、二……十 + 附录）
- 三 Skill 之间不得大段复制相同内容，各自维护最小必要集

## 六、Git 操作规范

### 6.1 分支规范
- **唯一分支**：本项目仅使用 `master` 单一分支，不创建 `main` 或其他长期分支
- **远程默认分支**：GitHub 仓库默认分支设置为 `master`
- **禁止操作**：不得创建 `main` 分支，不得将默认分支改为其他名称
- **AI Agent 须知**：
  - 推送前确认当前在 `master` 分支：`git branch --show-current`
  - 若有远程 `main` 残留，立即删除：`git push origin --delete main`
  - 若远程默认分支不是 `master`，通过 GitHub API 修正

### 6.2 提交规范
- 提交前检查 `git diff --staged` 不包含 `.env` 或硬编码密码
- 每次提交附带清晰的 commit message（中文）
- 工具改动时同步更新该工具的 README
- 项目结构变更时同步更新根 README
- 不提交 `output/`、`node_modules/`、`.env`、`*.log`

## 七、新工具创建模板

```
tools/<tool-name>/
├── index.js       # 主入口，支持命令行参数
├── README.md      # AI Agent 使用说明
└── lib/           # 工具内部模块（可选）
```
