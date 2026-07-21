# Tasks

- [x] Task 1: 重写 `checklist-manager.js` 路径推导与 check 文件生成
  - [ ] `planDir()` 重写为 `checkDir(outlinePath)`：从大纲路径提取报告名，返回 `output/qrs/<报告名>/`
  - [ ] `checklistPath()` 改为返回 `<checkDir>/check.md`
  - [ ] `createChecklist` 重写为 `createCheckFile`：生成含证据戳 + 执行进度 + 章节清单的完整 check.md
  - [ ] 新增 `markCheckItem(outlinePath, label)`：勾选指定标签的复选框（"审阅通过"/"创建章节"/"ChN"）
  - [ ] 新增 `isCheckItemChecked(outlinePath, label)`：读取指定复选框状态
  - [ ] 保留 `markChapterDone` 作为 `markCheckItem(outlinePath, 'ChN')` 的别名
  - [ ] 保留 `validateChecklist`、`rebuildChecklist`、`readChecklist`
  - [ ] 导出新函数

- [x] Task 2: 改造 `state-manager.js` 为 check 文件操作
  - [ ] `createState()` 改为调用 `createCheckFile()`
  - [ ] `approve()` 改为调用 `markCheckItem(outlinePath, '审阅通过')`
  - [ ] `readState()` 改为从 check 文件中解析证据戳（提取时间、章节数）和审阅状态
  - [ ] `requireApproval()` 改为调 `isCheckItemChecked(outlinePath, '审阅通过')`

- [x] Task 3: 更新 `index.js` 路径和流程
  - [ ] `TXT_DIR`、`PLAN_DIR` 等路径常量改为 `QRS_DIR = output/qrs/`
  - [ ] `extract` 流程：输出大纲到 `output/qrs/<报告名>/大纲.txt`，同步调用 `createCheckFile`
  - [ ] `approve` 流程：调 `markCheckItem` 勾选审阅通过
  - [ ] `status` 流程：从 check 文件读取证据戳和进度状态
  - [ ] `create` 流程：全部章节创建成功后，调 `markCheckItem(outlinePath, '创建章节')`
  - [ ] `design` 流程：checklist 路径适配新的项目文件夹结构

- [x] Task 4: 更新 `README.md`
  - [ ] 输出目录结构说明更新为项目级文件夹模式
  - [ ] 文件结构部分更新：`checklist-manager.js` 描述更新
  - [ ] 注意事项中新增"check.md 为单一证据源"说明

# Task Dependencies
- Task 2 依赖 Task 1（check 文件读写函数需就绪）
- Task 3 依赖 Task 1、Task 2（入口流程依赖底层模块）
- Task 4 可与 Task 3 并行
