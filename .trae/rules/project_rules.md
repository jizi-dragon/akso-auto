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

## 五、Git 操作规范

### 5.1 分支规范
- **唯一分支**：本项目仅使用 `master` 单一分支，不创建 `main` 或其他长期分支
- **远程默认分支**：GitHub 仓库默认分支设置为 `master`
- **禁止操作**：不得创建 `main` 分支，不得将默认分支改为其他名称
- **AI Agent 须知**：
  - 推送前确认当前在 `master` 分支：`git branch --show-current`
  - 若有远程 `main` 残留，立即删除：`git push origin --delete main`
  - 若远程默认分支不是 `master`，通过 GitHub API 修正

### 5.2 提交规范
- 提交前检查 `git diff --staged` 不包含 `.env` 或硬编码密码
- 每次提交附带清晰的 commit message（中文）
- 工具改动时同步更新该工具的 README
- 项目结构变更时同步更新根 README
- 不提交 `output/`、`node_modules/`、`.env`、`*.log`

## 六、新工具创建模板

```
tools/<tool-name>/
├── index.js       # 主入口，支持命令行参数
├── README.md      # AI Agent 使用说明
└── lib/           # 工具内部模块（可选）
```
