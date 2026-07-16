# Checklist

- [x] `lib/state-manager.js` 实现 readState / createState / approve / isApproved / resetApproval
- [x] `.qrs-state.json` 含 outlinePath、inputPath、extractedAt、approved、approvedAt、chapterCount 字段
- [x] extract 命令拒绝 `.docx` 以外的格式，提示用户转换
- [x] extract 成功后创建 `.qrs-state.json`，打印审批提示
- [x] create 命令在未审批时拒绝执行，退出码非 0
- [x] design 命令在未审批时拒绝执行，退出码非 0
- [x] approve 子命令可标记审批通过
- [x] status 子命令可查看当前状态（已提取/已审批/章节数/时间）
- [x] 重新 extract 会重置 approved 为 false
- [x] all 子命令已移除
- [x] README 已更新（新子命令、审批流程说明）
