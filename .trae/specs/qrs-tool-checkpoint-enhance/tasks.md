# Tasks

- [x] Task 1: 创建输出子目录并调整默认路径
  - [x] SubTask 1.1: 在 `index.js` 中确保 `output/qrs/txt/`、`output/qrs/plan/`、`output/qrs/temp/` 三个子目录在首次使用时自动创建
  - [x] SubTask 1.2: 修改 `extract` 子命令，默认输出路径从 `output/qrs/` 改为 `output/qrs/txt/`
  - [x] SubTask 1.3: 修改 `index.js` 中所有引用大纲路径的代码，适配 `txt/` 子目录

- [x] Task 2: 实现 checklist 进度追踪模块
  - [x] SubTask 2.1: 新建 `lib/checklist-manager.js`，实现 `createChecklist`（生成 checklist 文件）、`markChapterDone`（划掉完成章节）、`readChecklist`（读取已完成列表）
  - [x] SubTask 2.2: checklist 文件命名规则：`<报告名>_章节设计清单.md`，输出到 `output/qrs/plan/`
  - [x] SubTask 2.3: checklist 内容格式：章节序号 + 标题 + `[ ]` 占位，完成后改为 `[x]`

- [x] Task 3: 改造 design 子命令为逐章独立设计
  - [x] SubTask 3.1: 将 `index.js` 中 design 的循环逻辑改为逐章 try-catch，单章失败不中断后续
  - [x] SubTask 3.2: 设计开始前，读取 checklist（若存在），跳过已完成章节
  - [x] SubTask 3.3: 每完成一章，立即调用 `markChapterDone` 更新 checklist
  - [x] SubTask 3.4: 设计开始前若 checklist 不存在，自动创建

- [x] Task 4: 提升输入速度至 60ms
  - [x] SubTask 4.1: 在 `lib/chapter-automation.js` 中将键盘输入延迟从 100ms 改为 60ms

- [x] Task 5: 清理 `output/qrs/` 根目录旧文件
  - [x] SubTask 5.1: 删除 `output/qrs/_debug_styles2.js`（临时调试文件）
  - [x] SubTask 5.2: 保留现有 `.qrs-browser.json`、`.qrs-state.json`（运行时状态文件，仍放根目录）

# Task Dependencies

- Task 2 依赖 Task 1（子目录需先创建）
- Task 3 依赖 Task 2（checklist 模块需就绪）
- Task 4 独立（可与 Task 1-3 并行）
- Task 5 独立
