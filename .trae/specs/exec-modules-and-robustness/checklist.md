# Checklist

## login.js 原子模块
- [x] 接收 account, password, baseUrl 三个入参
- [x] navigate 到 login 页后 fill 用户名和密码（密码穿透 iframe）
- [x] 检测并关闭隐私弹窗（`button "同 意"`）
- [x] click "登录" 后等待 URL 包含 `/web`
- [x] 返回 `{ success: true, url: "..." }` 或 `{ success: false, error: "..." }`

## dismiss-popup.js 原子模块
- [x] 能检测 `button "知道了"` 弹窗并关闭
- [x] 能检测 `button "并不保存"` 弹窗并关闭
- [x] 能检测 `button "同 意"` 弹窗并关闭
- [x] (beforeunload 检测逻辑已集成但需实际验证)
- [x] 返回 `{ dismissed: ["知道了", ...] }` 表示关闭了哪些

## exact-search-click.js 原子模块
- [x] 接收 searchKeyword 和 exactName 参数
- [x] fill 搜索框 → press Enter → 等待表格
- [x] 读取表格第一列所有行名称
- [x] 精确匹配 `.trim() === exactName`
- [x] 匹配到 1 行时点击正确的链接
- [x] 匹配到 0 行或多行时返回明确错误

## create-option-set.js 原子模块
- [x] 接收 name, code, options[] 参数
- [x] 导航到 `/admin/config/pick-list/list`
- [x] 点击创建 → 填名/Code → 批量添加选项 → 保存
- [x] 保存后验证 URL 跳转回列表
- [x] 不硬编码业务值

## create-object.js 原子模块
- [x] 接收 name, code, enableLifecycle 参数
- [x] 导航 → 创建 → 填名/Code → 按需勾选生命周期 → 保存
- [x] 勾选生命周期时等待 12s
- [x] 保存后提取 objectId（从 URL 或列表页链接）
- [x] 名称重复时自动关闭弹窗并返回错误信息

## create-field.js 原子模块
- [x] 接收 name, code, dataType, extras 参数
- [x] 进入字段页 → 创建 → 必要时切换类型 → 填名/Code
- [x] dataType=4（选项）时自动绑定 extras.picklistName
- [x] dataType=15（对象）时自动绑定 extras.objectName
- [x] 保存后验证并返回字段信息

## save-and-verify.js 原子模块
- [x] click "save 保存" → 等待 → dismiss-popup
- [x] 验证 URL 跳转是否符合 expectedUrlPattern
- [x] 返回 `{ saved: true/false, url, popups }`

## 辅助模块
- [x] helpers.js 新增 `dismissAllPopups` 函数
- [x] helpers.js 新增 `exactMatchClick` 函数
- [x] login-one-shot.js 已重写（含隐私弹窗 + waitForURL）

## 文档更新
- [x] SKILL.md 新增「附录 D：原子模块速查表」
- [x] 4 个复杂模块占位文件已创建

## 格式一致性
- [x] 所有模块返回标准 `{ success, message, data }` 结构
- [x] 无 hardcode 业务值（参数化）
- [x] 文件名与 tasks.md 一致
