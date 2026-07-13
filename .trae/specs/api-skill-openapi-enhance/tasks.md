# Tasks

- [x] Task 1: 更新 api-helpers.js — 新增 5 个 OpenAPI 查询函数
  - [x] 1.1 新增 `getOpenApiToken(account, password)` — 调用 `POST /api/openapi/v1.0/Auth`，返回 JWT token
  - [x] 1.2 新增 `getObjectInfo(objectCode)` — 调用 `GET /api/openapi/v1.0/BasicObject/{code}`，返回 `{ id, lifeCycleId, enableLifeCycle, ... }`
  - [x] 1.3 新增 `getFieldList(objectCode, fieldCode?)` — 调用 `GET /api/openapi/v1.0/BasicObject/field/{code}/{fieldCode?}`，返回字段列表（fieldCode 为空时查询全部）
  - [x] 1.4 新增 `getPicklistOptions(code)` — 调用 `GET /api/openapi/v1.0/BasicObject/picklist/{code}`，返回选项值列表（含每个选项的 id）
  - [x] 1.5 新增 `getLifecycleStatus(objectCode)` — 调用 `GET /api/openapi/v1.0/BasicObject/lifecycleStatus/{code}`，返回状态列表（含每个状态的 id、code、name）
  - [x] 1.6 所有函数统一使用 `Authorization: Bearer <token>` 头，基路径为 `/api/openapi/v1.0/`
  - [x] 1.7 新增统一的错误处理逻辑：检查 `code !== 0` 时输出 `message`，对照错误码表给出建议

- [x] Task 2: 更新 SKILL.md — 新增 §十一「OpenAPI 查询辅助层」
  - [x] 2.1 在现有第十章之后新增 §十一「OpenAPI 查询辅助层」，与现有管理端 API（§二~§九）清晰区分
  - [x] 2.2 §11.1 — 概述：说明 OpenAPI 与管理端内部 API 的区别，适用场景（查询/验证/获取 ID），引用 `标准API文档-V1.0.md`
  - [x] 2.3 §11.1 — 获取对象信息（`GET /BasicObject/{code}`）：接口定义、参数、返回结构、代码示例
  - [x] 2.4 §11.2 — 获取字段列表（`GET /BasicObject/field/{code}`）：接口定义、参数、返回结构、代码示例
  - [x] 2.5 §11.3 — 获取选项列表（`GET /BasicObject/picklist/{code}`）：接口定义、参数、返回结构、代码示例
  - [x] 2.6 §11.4 — 获取生命周期状态（`GET /BasicObject/lifecycleStatus/{code}`）：接口定义、参数、返回结构、代码示例
  - [x] 2.7 §11.5 — 备用 Token 认证（`POST /Auth`）：接口定义、参数、返回结构，标注「⚠️ 明文密码，仅内部自动化」
  - [x] 2.8 §11.6 — OpenAPI 错误码速查表（引用标准文档 §3.4 + §3.3 返回结构）

- [x] Task 3: 更新 SKILL.md — 修改现有章节
  - [x] 3.1 在第二章（对象创建）末尾新增「获取 objectId」指引，指向 §11.1
  - [x] 3.2 在第四章（字段）末尾新增「验证字段创建」指引，指向 §11.2
  - [x] 3.3 在第三章（选项集）末尾新增「验证选项集」指引，指向 §11.3
  - [x] 3.4 在第七章（生命周期）末尾新增「验证生命周期状态」指引，指向 §11.4
  - [x] 3.5 更新执行策略表（§10.1），新增「查询验证 API」列
  - [x] 3.6 更新能力边界表，新增「🔍 可验证（OpenAPI）」级
  - [x] 3.7 已实现 — 错误码表在 §0.5 和 §11.6
  - [x] 3.8 更新附录 API 路径速查表，新增 OpenAPI 路径区

- [x] Task 4: 更新 full-workflow.md 示例
  - [x] 4.1 在步骤 3（获取对象 ID）中增加通过 `getObjectInfo` API 获取 ID 的方式（作为备选方案）
  - [x] 4.2 在最后新增「步骤 6：验证配置结果」示例，展示用 OpenAPI 查询接口验证创建结果

# Task Dependencies
- Task 2 依赖 Task 1（脚本函数准备好后，章节中才能引用正确的函数名）
- Task 3 依赖 Task 2（现有章节的修改需要引用新章节编号）
- Task 4 可与其他任务并行
- 建议执行顺序：Task 1 → Task 2 → Task 3，Task 4 可并行
