# Checklist

- [x] 工具目录 `tools/qrs-report-creator/` 存在且包含三个强制文件：`index.js`、`README.md`、`lib/`
- [x] `index.js` 支持 `extract`、`create`、`design`、`all` 四个子命令
- [x] `index.js` 支持通过 `--input`、`--output` 等参数和 `AKSO_BASE_URL` 等环境变量传入配置
- [x] `lib/extract-outline.py` 可从命令行接收 `--input` 和 `--output` 参数，无硬编码路径
- [x] `lib/chapter-automation.js` 调用 `shared/browser-manager.js` 完成登录，不重复实现登录逻辑
- [x] `extract` 子命令执行后生成三层结构 `完整大纲.txt`（TOC / 子标题结构 / 大纲+文字段落）
- [x] `create` 子命令执行后在系统中批量创建一级章节目录
- [x] `design` 子命令执行后逐章在 ONLYOFFICE Canvas 编辑器中写入大纲文本
- [x] `all` 子命令可一键串联提取→创建→设计全流程
- [x] 代码中无硬编码的系统地址、账号、密码
- [x] `README.md` 包含工具功能概述、安装依赖说明、命令行参数速查表、各子命令使用示例
- [x] 工具不引用其他 `tools/` 目录下的内部实现
