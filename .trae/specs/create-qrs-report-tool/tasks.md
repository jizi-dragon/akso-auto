# Tasks

- [x] Task 1: 创建工具目录结构与主入口
  - [x] SubTask 1.1: 创建 `tools/qrs-report-creator/` 目录及 `index.js`、`README.md`、`lib/` 骨架
  - [x] SubTask 1.2: 在 `index.js` 中实现 CLI 参数解析（sub-command: `extract` / `create` / `design` / `all`）
  - [x] SubTask 1.3: 实现环境变量读取（`AKSO_BASE_URL`、`AKSO_USERNAME`、`AKSO_PASSWORD`）

- [x] Task 2: 迁移文档大纲提取脚本
  - [x] SubTask 2.1: 将 `extract_v4.py` 迁移为 `lib/extract-outline.py`，去除硬编码路径，通过命令行参数传入 `--input` 和 `--output`
  - [x] SubTask 2.2: 在 `index.js` 的 `extract` 子命令中通过 `child_process` 调用 Python 脚本，支持错误处理和退出码传递

- [x] Task 3: 实现章节批量创建模块
  - [x] SubTask 3.1: 在 `lib/chapter-automation.js` 中实现 `loginAndNavigate(page, baseUrl, username, password)` 登录函数（调用 `shared/browser-manager.js`）
  - [x] SubTask 3.2: 实现 `createChapters(page, chapters)` 批量创建章节函数（基于 `chapter_automation.js` 模板，含幂等处理）
  - [x] SubTask 3.3: 在 `index.js` 的 `create` 子命令中串联登录 → 导航 → 创建 → 验证 → 关闭浏览器

- [x] Task 4: 实现章节内容设计模块
  - [x] SubTask 4.1: 在 `lib/chapter-automation.js` 中实现 `designChapter(page, nthIndex, lines)` 单章设计函数（Canvas 编辑器输入 + 双保存 + 返回）
  - [x] SubTask 4.2: 实现 `parseOutline(outlinePath)` 从 `完整大纲.txt` 解析指定章节内容
  - [x] SubTask 4.3: 在 `index.js` 的 `design` 子命令中串联登录 → 逐章设计 → 关闭浏览器，支持 `--chapters` 参数指定范围

- [x] Task 5: 实现全流程一键执行
  - [x] SubTask 5.1: 在 `index.js` 的 `all` 子命令中串联提取 → 创建 → 设计三阶段，每阶段输出进度

- [x] Task 6: 编写 README 文档
  - [x] SubTask 6.1: 编写 `README.md`：工具功能概述、安装依赖说明、命令行参数速查表、各子命令使用示例

- [x] Task 7: 清理冗余 Skill 文件并同步关联
  - [x] SubTask 7.1: 在 Skill 的 SKILL.md 中添加引用，指向 `tools/qrs-report-creator/`（Skill 来自外部 zip，非项目内 .trae/skills 目录，无需修改）
  - [x] SubTask 7.2: 清理 `output/temp_qrs_extract/` 临时解压目录
