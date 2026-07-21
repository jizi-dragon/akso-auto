# Checklist

- [x] `output/qrs/txt/` 目录在 extract 时自动创建，大纲文件默认输出到该目录
- [x] `output/qrs/plan/` 目录在 design 时自动创建，checklist 文件以 `<报告名>_章节设计清单.md` 命名
- [x] `output/qrs/temp/` 目录可作为临时脚本存放位置
- [x] extract 子命令在不指定 `--output` 时，默认输出到 `output/qrs/txt/`
- [x] `lib/checklist-manager.js` 存在且导出 `createChecklist`、`markChapterDone`、`readChecklist` 三个函数
- [x] design 开始时若无 checklist 则自动创建，若已存在则读取跳过已完成章节
- [x] design 逐章独立执行，单章失败后继续下一章，不中止整个流程
- [x] 每完成一章，checklist 中对应条目从 `[ ]` 变为 `[x]`
- [x] 键盘输入延迟为 60ms（在 `chapter-automation.js` 中验证）
- [x] `output/qrs/` 根目录下无 `.js` 临时调试脚本残留
