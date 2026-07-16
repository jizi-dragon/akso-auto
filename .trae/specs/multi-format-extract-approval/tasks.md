# Tasks

- [x] Task 1: 实现审批状态管理模块
  - [x] SubTask 1.1: 创建 `lib/state-manager.js`
  - [x] SubTask 1.2: 实现 `readState(outlinePath)` — 读取 `.qrs-state.json`
  - [x] SubTask 1.3: 实现 `createState(outlinePath, meta)` — 创建状态文件，meta 含 `inputPath`、`chapterCount`
  - [x] SubTask 1.4: 实现 `approve(outlinePath)` — 标记 `approved: true`
  - [x] SubTask 1.5: 实现 `isApproved(outlinePath)` — 返回布尔值
  - [x] SubTask 1.6: 实现 `resetApproval(outlinePath)` — 重置 `approved: false`
  - [x] SubTask 1.7: 导出所有函数为 CommonJS 模块

- [x] Task 2: 重构 index.js 主入口
  - [x] SubTask 2.1: `extract` 命令增加格式检测：仅允许 `.docx`，其他格式拒绝并提示转换
  - [x] SubTask 2.2: `extract` 成功后调用 `createState()` 写入状态文件，打印审批提示语
  - [x] SubTask 2.3: `create` 命令执行前调用 `requireApproval()`，检查 `isApproved()`，未审批则拒绝退出
  - [x] SubTask 2.4: `design` 命令执行前同上审批检查
  - [x] SubTask 2.5: 新增 `approve` 子命令
  - [x] SubTask 2.6: 新增 `status` 子命令
  - [x] SubTask 2.7: 移除 `all` 子命令（不再支持一键全流程）

- [x] Task 3: 更新 README 文档
  - [x] SubTask 3.1: 更新子命令表（新增 approve / status，移除 all）
  - [x] SubTask 3.2: 添加两步审批流程说明与完整示例

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 可与其他 Task 并行
