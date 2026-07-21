# Tasks

- [x] Task 1: 移动 `akso-basic-config` 到 `tools/` 并改造为工具格式
  - [ ] 将 `.trae/skills/akso-basic-config/` 整体复制到 `tools/akso-basic-config/`
  - [ ] 将 `scripts/` 目录重命名为 `lib/`（符合工具规范）
  - [ ] 检查 `lib/` 下所有 JS 文件对 `shared/browser-manager` 的引用路径，修正为 `../../shared/browser-manager`
  - [ ] 将 `SKILL.md` 改造为 `README.md`（移除 YAML front-matter，保留为纯工具使用说明，更新内部引用为"工具"）
  - [ ] 将 `examples/` 移入 `lib/` 或直接保留在工具根目录
  - [ ] 确认 `lib/` 中有可作为入口的 JS 文件，根目录创建 `index.js` 作为薄壳入口
  - [ ] 删除 `CHANGELOG.md`（工具不需要独立 changelog）
  - [ ] Grep 确认工具内无对 `tools/akso-basic-config-api/` 或 `tools/akso-gmp/` 的引用

- [x] Task 2: 移动 `akso-basic-config-api` 到 `tools/` 并改造为工具格式
  - [ ] 将 `.trae/skills/akso-basic-config-api/` 整体复制到 `tools/akso-basic-config-api/`
  - [ ] 将 `scripts/` 目录重命名为 `lib/`（符合工具规范）
  - [ ] 检查 `lib/` 下所有 JS 文件对 `shared/browser-manager` 的引用路径，修正为 `../../shared/browser-manager`
  - [ ] 将 `SKILL.md` 改造为 `README.md`（移除 YAML front-matter，保留为纯工具使用说明，更新内部引用为"工具"）
  - [ ] 将 `examples/` 移入 `lib/` 或直接保留在工具根目录
  - [ ] `lib/index.js` 已有入口，根目录创建 `index.js` 作为薄壳入口 `require('./lib/index')`
  - [ ] Grep 确认工具内无对 `tools/akso-basic-config/` 或 `tools/akso-gmp/` 的引用

- [x] Task 3: 移动 `akso-gmp` 到 `tools/` 并改造为工具格式
  - [ ] 将 `.trae/skills/akso-gmp/` 整体复制到 `tools/akso-gmp/`
  - [ ] 将 `playbooks/` 移入新建的 `lib/` 目录（`playbooks/` 无实际 JS 模块，作为工具数据目录）
  - [ ] 将 `export/pack.sh` 移入 `lib/`
  - [ ] 将 `SKILL.md` 改造为 `README.md`（移除 YAML front-matter，所有"Skill"引用改为"工具"，"两个执行 Skill"改为"两个执行工具"）
  - [ ] 创建 `index.js` 薄壳入口（编排工具的 CLI 入口），暂输出使用说明即可
  - [ ] Grep 确认工具内无对 `tools/akso-basic-config/` 或 `tools/akso-basic-config-api/` 的代码引用

- [x] Task 4: 删除原始的 Skill 目录和根空目录
  - [ ] 删除 `.trae/skills/akso-gmp/`
  - [ ] 删除 `.trae/skills/akso-basic-config/`
  - [ ] 删除 `.trae/skills/akso-basic-config-api/`
  - [ ] 删除 `d:\akso\akso-auto\scripts\`

- [x] Task 5: 更新 `project_rules.md`
  - [ ] 一、目录隔离原则：移除 `.trae/skills/` 相关行（或改为"已废弃，目录保留为空"）
  - [ ] 二、工具开发规范：追加"工具变更必须同步 README"条款
  - [ ] 五、整个章节重写：Skill 清单改为空，移除三层架构，移除格式规范，移除数量红线
  - [ ] 若保留"五、"编号，内容简化为"本项目不再维护自定义 TRAE Skill，原有 Skill 能力已迁移到 tools/"

- [x] Task 6: 更新根 `README.md`
  - [ ] 更新项目结构图，`.trae/skills/` 移除，`tools/` 增加 3 个新工具
  - [ ] 更新工具列表：从 2 个变为 5 个（form-analyzer, qrs-report-creator, akso-gmp, akso-basic-config, akso-basic-config-api）
  - [ ] 移除 Skill 相关说明段落
  - [ ] 更新快速开始示例

# Task Dependencies
- Task 4 depends on Task 1, Task 2, Task 3（必须先复制完再删原目录）
- Task 1、Task 2、Task 3 可并行
- Task 5、Task 6 可并行（纯文档更新，互不依赖）
