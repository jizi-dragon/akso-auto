# akso-basic-config-api 基于标准 OpenAPI 文档的健壮性增强 Spec

## Why
当前 akso-basic-config-api Skill 依赖管理端内部 API（`/api/platform/...`、`/api/config/...`）执行配置创建，存在三个核心痛点：

1. **objectId 无法自动获取**：`SaveBasicObject` 创建对象后不返回 objectId，Agent 被迫切回 DOM 模式从页面提取，破坏纯 API 工作流
2. **缺乏配置后验证能力**：对象/字段/选项集创建后无法通过 API 确认是否成功，只能靠经验判断
3. **Token 认证依赖 DOM cookie**：当前通过 `document.cookie` 提取 `__auth_token__` 的方式存在 SameSite 兼容性问题

而项目已提供 `标准API文档-V1.0.md`（1489 行），包含 24 个标准 OpenAPI 接口，其中查询类接口恰好可以填补上述能力缺口。

## What Changes
- **在 API Skill 中新增「OpenAPI 查询辅助层」章节**：收录标准 API 文档中可用于辅助配置流程的查询/验证接口
- **解决 objectId 自动获取**：利用 `GET /api/openapi/v1.0/BasicObject/{code}` 接口，通过对象 code 反查 objectId、lifecycleId
- **新增配置后验证能力**：创建字段/选项集后通过 `GET /api/openapi/v1.0/BasicObject/field/{objectCode}` 和 `GET /api/openapi/v1.0/BasicObject/picklist/{code}` 验证结果
- **新增 Token 认证备用方案**：收录 `POST /api/openapi/v1.0/Auth` 接口，提供纯 API 获取 JWT 令牌的备用路径
- **新增错误码速查表**：引用标准 API 文档 §3.4 的错误码清单，辅助问题排查
- **更新 api-helpers.js 脚本**：新增 `getObjectInfo`、`getFieldList`、`getPicklistOptions`、`getLifecycleStatus` 四个包装函数

## Impact
- Affected specs: N/A（本次为新增增强，不修改 skill 架构）
- Affected code/files:
  - `.trae/skills/akso-basic-config-api/SKILL.md` — 新增 §十一「OpenAPI 查询辅助层」
  - `.trae/skills/akso-basic-config-api/scripts/api-helpers.js` — 新增 4 个查询函数
  - `external_reference_resources/标准API文档-V1.0.md` — 作为引用源

---

## ADDED Requirements

### Requirement: OpenAPI 对象信息查询
系统 SHALL 在 API Skill 中收录 `GET /api/openapi/v{version}/BasicObject/{code}` 接口，用于通过对象 Code 获取完整的对象信息（含 objectId、lifecycleId、enableLifeCycle 等）。

#### Scenario: 创建对象后自动获取 objectId
- **GIVEN** Agent 通过 `SaveBasicObject` 创建了一个对象（code = `change_control__c`），但未获得 objectId
- **WHEN** Agent 调用 `GET /api/openapi/v1.0/BasicObject/change_control__c`
- **THEN** 返回 `data.id`（objectId）、`data.lifeCycleId`（生命周期 ID）、`data.enableLifeCycle`（是否启用生命周期）
- **AND** Agent 可以继续后续的字段创建、生命周期配置，无需切回 DOM 模式

### Requirement: OpenAPI 字段列表查询
系统 SHALL 在 API Skill 中收录 `GET /api/openapi/v{version}/BasicObject/field/{objectCode}/{fieldCode}` 接口，用于查询对象的字段列表，支持验证字段是否创建成功。

#### Scenario: 批量创建字段后验证
- **GIVEN** Agent 调用 `SaveField` 批量创建了 10 个字段
- **WHEN** Agent 调用 `GET /api/openapi/v1.0/BasicObject/field/change_control__c`（不传 fieldCode）
- **THEN** 返回 `data[]` 字段列表，包含每个字段的 name、code、dataType、id
- **AND** Agent 可以对比蓝图中的字段表与实际返回的字段列表，验证完整性

### Requirement: OpenAPI 选项集查询
系统 SHALL 在 API Skill 中收录 `GET /api/openapi/v{version}/BasicObject/picklist/{code}` 接口，用于查询选项集的选项值。

#### Scenario: 创建选项集后验证
- **GIVEN** Agent 通过 `ObjectPicklist/save` 创建了一个选项集
- **WHEN** Agent 调用 `GET /api/openapi/v1.0/BasicObject/picklist/option_change_type`
- **THEN** 返回 `data[]` 选项值列表，含每个选项的 id、name、code
- **AND** Agent 可确认选项值和 picklistId 是否正确

### Requirement: OpenAPI 生命周期状态查询
系统 SHALL 在 API Skill 中收录两个生命周期状态查询接口：
- `GET /api/openapi/v{version}/BasicObject/lifecycleStatus/{objectCode}` — 通过对象 code 查询生命周期状态
- `GET /api/openapi/v{version}/Object/status/{object_code}` — 同样用途，通过对象 code 查状态列表

#### Scenario: 创建生命周期状态后验证
- **GIVEN** Agent 通过 `Status/Create` 创建了多个生命周期状态
- **WHEN** Agent 调用 `GET /api/openapi/v1.0/BasicObject/lifecycleStatus/change_control__c`
- **THEN** 返回状态列表，含每个状态的 id、code、name、lifecycleId
- **AND** Agent 可验证状态数量和命名是否符合蓝图规划

### Requirement: OpenAPI 令牌获取（备用认证）
系统 SHALL 在 API Skill 中收录 `POST /api/openapi/v{version}/Auth` 接口，作为备用的纯 API 认证路径。

#### Scenario: cookie token 失效时的备用认证
- **GIVEN** 当前 DOM 登录后提取的 `__auth_token__` cookie 过期（或 SameSite 限制导致 fetch 无法携带）
- **WHEN** Agent 调用 `POST /api/openapi/v1.0/Auth`，传入 `{ account, password }`（明文密码）
- **THEN** 返回 `data` 字段包含 JWT token，有效期 60 分钟
- **AND** Agent 可用此 token 通过 `Authorization: Bearer` 头访问 OpenAPI 查询接口

### Requirement: 错误码速查
系统 SHALL 在 API Skill 中新增错误码速查表，引用标准 API 文档 §3.4 的错误码定义，辅助 Agent 在使用 API 过程中快速诊断问题。

### Requirement: api-helpers.js 脚本增强
系统 SHALL 在 `scripts/api-helpers.js` 中新增以下 4 个包装函数：
- `getObjectInfo(objectCode)` — 封装 §4.8 接口
- `getFieldList(objectCode, fieldCode?)` — 封装 §4.6 接口
- `getPicklistOptions(code)` — 封装 §4.7 接口
- `getLifecycleStatus(objectCode)` — 封装 §4.5 接口
- `getOpenApiToken(account, password)` — 封装 §4.1 接口（备用认证）

所有函数统一使用 `Authorization: Bearer <token>` 头调用 OpenAPI 路径（`/api/openapi/v1.0/...`），而非管理端内部路径。

---

## MODIFIED Requirements

### Requirement: 执行策略表更新
**Before**: 执行策略表仅标记每个配置项的 DOM/API 成熟度，未体现「查询验证」这一维度。

**After**: 在现有三级成熟度表基础上新增一列「查询验证 API」，标注每个配置项创建后可通过哪个 OpenAPI 接口验证：

| 配置项 | 创建 API | 验证 API |
|--------|----------|----------|
| 对象 | SaveBasicObject | `GET .../BasicObject/{code}` |
| 字段 | SaveField | `GET .../BasicObject/field/{objCode}` |
| 选项集 | ObjectPicklist/save | `GET .../BasicObject/picklist/{code}` |
| 生命周期状态 | Status/Create | `GET .../BasicObject/lifecycleStatus/{objCode}` |

### Requirement: 能力边界表更新
**Before**: 分为 ✅已支持 / ⚠️待验证 / ❌待探索 三级。

**After**: 新增第四级「🔍 可验证（OpenAPI）」列出可通过 OpenAPI 查询接口验证的配置项。

### Requirement: 认证章节补充
**Before**: 认证仅描述 DOM 登录 + cookie token 提取一种方式。

**After**: 在现有认证方案后新增「备用路径：OpenAPI Token 认证」，说明 `POST /api/openapi/v1.0/Auth` 的接口定义、参数格式和适用场景。标注「⚠️ 明文密码传输，仅用于内部自动化场景」。
