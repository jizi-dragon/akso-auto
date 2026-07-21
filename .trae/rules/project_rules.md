# Akso Auto 项目规则

## 一、目录隔离原则

- `tools/<tool-name>/` — 每个工具独立子目录，工具之间互不依赖、互不干扰，各自含 `index.js`（入口）+ `README.md`（AI 使用说明）+ `lib/`（内部模块目录）
- `output/` — 工具运行时产物（不入 Git，见 `.gitignore`）
- `.trae/skills/` — 已废弃，目录保留为空（原有 Skill 全部迁移到 `tools/`）
- `output/blueprints/` — **实际配置蓝图归档**（如 `dinner-tonight-blueprint.md`）
- `.trae/documents/` — 计划文档归档
- `test-fixtures/` — 测试用例存放目录（.docx 模板文件等）
- `external_reference_resources/` — 外部参考文档（API 文档、配置示例等）

## 二、工具开发规范

- 工具之间相互独立，互不干扰，禁止跨工具引用内部实现（共享代码抽到 `shared/` 目录）
- 每个工具**必须**包含以下三项内容（强制）：
  - `index.js` — 主入口（主程序），支持命令行参数
  - `README.md` — 工具介绍及 AI Agent 使用说明
  - `lib/` — 工具内部模块目录（存放模块文件、JSON 数据文件等）
- 新工具 npm 依赖统一在顶层 `package.json` 管理
- 工具要支持通过命令行参数 + 环境变量传入所有配置项
- 对 `tools/` 下任何工具进行代码或结构变更时，必须同步更新该工具的 `README.md`，确保文档与实现一致

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

## 五、工具协作关系

> 本项目不再维护自定义 TRAE Skill。原有 3 个 Skill（`akso-gmp`、`akso-basic-config`、`akso-basic-config-api`）已全部迁移到 `tools/` 目录，遵守工具开发规范。

### 5.1 编排工具与执行工具的协作

```
tools/akso-gmp（编排工具）
  ├── 分析需求、产出配置蓝图
  ├── 决策 DOM/API 执行路径
  └── 质量检查 + 归档 Playbook
        ↓
tools/akso-basic-config（DOM 执行工具）    tools/akso-basic-config-api（API 执行工具）
  ├── 登录 / 可视化验证                     ├── 批量对象/字段/布局创建
  ├── 生命周期复杂操作                       ├── 选项集批量操作
  └── 工作流 / 权限                          └── 状态查询 / 数据验证
        ↓
output/blueprints/（共享产物）
  └── 配置蓝图 + 执行记录
```

**核心约束**：三个工具之间无代码级依赖。协作通过约定格式的配置蓝图文件（Markdown）松耦合。

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
├── index.js       # 主入口（主程序），支持命令行参数（强制）
├── README.md      # 工具介绍及 AI Agent 使用说明（强制）
└── lib/           # 内部模块目录，存放模块文件、JSON 数据文件等（强制）
```

## 八、Playwright 浏览器生命周期管理

> ⚠️ **红线**：禁止使用任何系统级命令（`Get-Process`、`Stop-Process`、`taskkill`、`killall` 等）无差别终止 Chrome 进程，会连带关闭用户自己打开的浏览器窗口。

### 8.1 两种工作模式

| 模式 | 适用场景 | 浏览器生命周期 | 结束时 |
|------|----------|---------------|--------|
| **执行模式** | 自动化配置任务（创建对象/字段/批量操作），完成后无需人工审阅 | `chromium.launch()` 启动，脚本管理 | `await browser.close()` 正常关闭，释放资源 |
| **调试模式** | 需要用户审阅、演示、逐步指导、收集 DOM 结构 | `chromium.launch()` 启动，**不调用 close()** | 等待用户确认完成后再调用 `browser.close()`，或由用户手动关闭浏览器窗口 |

### 8.2 执行模式模板

```js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await doWork(page);  // 执行自动化任务

  await browser.close();  // 正常关闭
})().catch(console.error);
```

### 8.3 调试模式模板

```js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--remote-debugging-port=9222']  // 必须暴露 CDP 端口
  });
  const page = await browser.newPage();

  await doWork(page);  // 执行操作

  console.log('READY. CDP: http://localhost:9222');
  // ⚠️ 调试模式下不调用 browser.close()
  // 后续通过 connectOverCDP 连接继续操作
  // 或等用户手动关闭浏览器窗口后 node 进程自动退出
})();
```

### 8.4 CDP 连接与清理

```js
// ✅ 正确：连接已有浏览器实例
const browser = await chromium.connectOverCDP('http://localhost:9222');
const page = browser.contexts()[0].pages()[0];
await doWork(page);
await browser.close();  // 仅断开 CDP 连接，浏览器窗口保留

// ❌ 绝对禁止：杀系统进程
// Get-Process -Name "chrome" | Stop-Process -Force  ← 会杀掉用户自己的 Chrome！

// ✅ 残留清理：以当前 CDP 端口为目标精准关闭
// 方案A: 同名端口已被占用 → connectOverCDP → browser.close()
// 方案B: 等 node 进程退出，Playwright 自动清理其 launch() 的子进程
```

### 8.5 模式选择决策树

```
用户说"创建/配置/执行" + 不需要审阅 → 执行模式
  ├── 脚本末尾调用 browser.close()
  └── 完成后输出结果

用户说"演示/学习/审阅/先不要保存" → 调试模式
  ├── 启动时暴露 CDP 端口 (--remote-debugging-port=9222)
  ├── 完成任务后不 close，输出 "READY"
  ├── 后续通过 connectOverCDP 连接继续操作
  └── 用户发送"关闭浏览器"指令时 → connectOverCDP → browser.close()
```
