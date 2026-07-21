# Checklist

- [x] extract 执行后 `output/qrs/<报告名>/` 目录自动创建
- [x] extract 执行后同时产出 `大纲.txt` 和 `check.md`
- [x] `check.md` 顶部含证据戳（提取时间、来源文档、章节数）
- [x] `check.md` 含 `- [ ] 审阅通过` 和 `- [ ] 创建章节` 两个顶层勾选项
- [x] `check.md` 含章节设计清单
- [x] approve 命令执行后 `check.md` 中 `审阅通过` 变为 `[x]`
- [x] approve 命令不再产生 `.qrs-state.json`
- [x] create 全部成功后 `check.md` 中 `创建章节` 变为 `[x]`
- [x] 未审批时 create/design 被拒绝执行
- [x] `status` 命令从 check 文件读取并输出正确状态
- [x] design 跳过已完成的章节，成功后将对应 ChN 行勾选
- [x] 旧的 `output/qrs/txt/` 和 `output/qrs/plan/` 目录不再被使用
- [x] `README.md` 描述的输出结构与实现一致
