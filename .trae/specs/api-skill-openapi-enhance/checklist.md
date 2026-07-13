# Checklist

## api-helpers.js 函数完整性
- [x] `getOpenApiToken(account, password)` 函数存在，调用 `POST /api/openapi/v1.0/Auth`
- [x] `getObjectInfo(objectCode)` 函数存在，调用 `GET /api/openapi/v1.0/BasicObject/{code}`
- [x] `getFieldList(objectCode, fieldCode?)` 函数存在，调用 `GET /api/openapi/v1.0/BasicObject/field/{code}/{fieldCode?}`
- [x] `getPicklistOptions(code)` 函数存在，调用 `GET /api/openapi/v1.0/BasicObject/picklist/{code}`
- [x] `getLifecycleStatus(objectCode)` 函数存在，调用 `GET /api/openapi/v1.0/BasicObject/lifecycleStatus/{code}`
- [x] 所有函数使用 `Authorization: Bearer <token>` 请求头
- [x] 所有函数有错误处理（检查 `code !== 0`）
- [x] 函数通过 `window.__aksoAPI` 暴露给 `page.evaluate` 使用

## SKILL.md 新增内容
- [x] §十一「OpenAPI 查询辅助层」章节存在
- [x] §11.1 概述中说明了 OpenAPI 与管理端 API 的区别和适用场景
- [x] §11.1 包含获取对象信息的完整接口定义和代码示例
- [x] §11.2 包含获取字段列表的完整接口定义和代码示例
- [x] §11.3 包含获取选项列表的完整接口定义和代码示例
- [x] §11.4 包含获取生命周期状态的完整接口定义和代码示例
- [x] §11.5 包含备用 Token 认证的接口定义和代码示例，有安全警告标注
- [x] §11.6 包含 OpenAPI 错误码速查表
- [x] 引用了 `标准API文档-V1.0.md`

## SKILL.md 现有章节修改
- [x] 第二章（对象创建）末尾有指向 §11.1 获取 objectId 的指引
- [x] 第四章（字段）末尾有指向 §11.2 验证字段创建的指引
- [x] 第三章（选项集）末尾有指向 §11.3 验证选项集的指引
- [x] 第七章（生命周期）末尾有指向 §11.4 验证生命周期状态的指引
- [x] §10.1 执行策略表中新增「查询验证 API」列
- [x] 能力边界表中新增「🔍 可验证（OpenAPI）」级
- [x] 附录 API 路径速查表中新增 OpenAPI 路径区

## full-workflow.md 示例更新
- [x] 步骤 3（获取对象 ID）增加了 `getObjectInfo` API 方式
- [x] 末尾增加了「步骤 6：验证配置结果」示例

## 格式一致性
- [x] 新章节编号与现有体系一致（零~十 + 十一，附录）
- [x] 新的接口文档格式与现有 API 参考手册格式一致（表格 + JSON 示例 + 代码片段）
- [x] 代码示例使用 `browser_run_code_unsafe` + `page.evaluate` 模式
- [x] 无新增 hardcode 敏感信息
