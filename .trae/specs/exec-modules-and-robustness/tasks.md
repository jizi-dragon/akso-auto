# Tasks

## 第一轮：登录 + 弹窗 + 精确搜索（3 个原子模块，逐个确认）

- [x] Task 1: 重写 `login.js` 原子模块
  - [x] 1.1 编写 `login.js`：参数化入口（account, password, baseUrl），整合"同意"弹窗检测+关闭，登录后等待 `/web`，返回 `{ success, url }`
  - [x] 1.2 **确认点**：在标准环境实际执行一次，验证隐私弹窗被正确处理

- [x] Task 2: 新建 `dismiss-popup.js` 原子模块
  - [x] 2.1 编写 `dismiss-popup.js`：检测 5 种弹窗类型并自动关闭，返回 `{ dismissed: string[] }`
  - [x] 2.2 将弹窗清除逻辑集成到 `login.js` 和后续模块中
  - [x] 2.3 **确认点**：在任一保存操作后故意触发错误，验证弹窗被自动关闭

- [x] Task 3: 新建 `exact-search-click.js` 原子模块
  - [x] 3.1 编写 `exact-search-click.js`：fill 搜索框 → Enter → 读表格 → 精确匹配行 → click，返回 `{ found: boolean, rowData }`
  - [x] 3.2 **确认点**：在对象列表中搜索"晚餐计划"，验证仅点击"晚餐计划"而非"晚餐计划电子签名"

## 第二轮：核心配置模块（逐个确认）

- [x] Task 4: 新建 `create-option-set.js` 原子模块
  - [x] 4.1 编写模块：导航 → 创建 → 填名/Code → 批量添加选项 → 保存
  - [x] 4.2 **确认点**：执行一次创建新选项集

- [x] Task 5: 新建 `create-object.js` 原子模块
  - [x] 5.1 编写模块：导航 → 创建 → 填名/Code → 勾选生命周期 → 保存 → 等待 → 提取 objectId
  - [x] 5.2 含对象名重复时的错误处理（关闭弹窗 → 返回 → 返回错误信息）
  - [x] 5.3 **确认点**：执行一次创建新对象

- [x] Task 6: 新建 `create-field.js` 原子模块
  - [x] 6.1 编写模块：进入对象字段页 → 创建 → 选类型 → 填名/Code → 绑定（选项/对象）→ 保存
  - [x] 6.2 支持 dataType 参数决定是否切换类型、是否绑定选项集或对象
  - [x] 6.3 **确认点**：执行一次创建"文本"类型字段和一次"选项"类型字段

- [x] Task 7: 新建 `save-and-verify.js` 原子模块
  - [x] 7.1 编写模块：click save → 等待 → 检测弹窗 → 验证 URL 跳转是否符合预期
  - [x] 7.2 **确认点**：在字段保存后调用，验证返回正确的 saved/error 状态

## 第三轮：整合与文档

- [x] Task 8: 重写 login-one-shot.js 为 `login.js` 的别名/精简版
- [x] Task 9: 在 helpers.js 新增 `exactMatchClick` 和 `dismissAllPopups` 两个通用函数
- [x] Task 10: SKILL.md 新增「附录 D：原子模块速查表」
- [x] Task 11: 4 个复杂模块占位文件创建
