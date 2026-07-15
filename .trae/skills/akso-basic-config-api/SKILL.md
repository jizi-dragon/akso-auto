---
name: akso-basic-config-api
display_name: "Akso eGMP 基础配置 — API 直调版"
description: "Akso eGMP 系统基础配置 Skill — API 直调版（Phase 2）。通过 HTTP API 直接创建对象、字段（14/16种类型）、选项集、表单布局、列表布局、生命周期状态，比 DOM 模式快 40x。执行引擎：Playwright npm 包 + page.evaluate(fetch)。内置 15s 自动刷新可视模式。覆盖 10 个模块共 12 核心 API + 8 待验证 API + 5 OpenAPI + 4 探索路标。"
description_zh: "Akso eGMP 基础配置 API 版：通过 HTTP 直调创建对象/字段/选项集/布局/生命周期状态，内置可视刷新，极速配置"
skill_role: executor_api
version: 0.5.0
allowed-tools: Bash, Read, Write, Skill, WebFetch
agent_created: true
---

# Akso eGMP 基础配置 — API 直调版 (Phase 2)

> **版本**：v0.5.0 — Playwright npm 包统一执行版  
> **适用对象**：WorkBuddy AI Agent  
> **执行入口**：Playwright npm 包 → `page.evaluate(fetch)`，由 `shared/browser-manager.js` 管理浏览器生命周期  
> **原则**：登录走浏览器 DOM（`shared/browser-manager.js`），配置走 HTTP API。一次登录，全程 API 直调。  
> **性能**：DOM 模式 2 分钟 → API 模式 3 秒（40x 提速）  
> **覆盖**：10 个模块 / 12 个核心 API（✅）+ 8 个待验证 API（⚠️）/ 14 种字段类型  
> **环境信息**：存储于外部 `AksoGMP_配置环境清单.xlsx`，本 Skill 不含密码

> 📂 **文件结构**：
> ```
> akso-basic-config-api/
> ├── SKILL.md                    ← 核心指令集 + 完整 API 参考
> ├── scripts/
> │   ├── core.js                 ← 核心工具：认证、HTTP 请求、响应校验、日志
> │   ├── visibility.js           ← 可视模式：15s 自动刷新
> │   ├── create-object.js        ← 对象创建
> │   ├── create-field.js         ← 字段创建（14 种类型快捷函数）+ 查询
> │   ├── create-picklist.js      ← 选项集创建
> │   ├── save-form-layout.js     ← 表单布局保存
> │   ├── save-list-layout.js     ← 列表布局（两步创建）
> │   ├── create-lifecycle-status.js ← 生命周期状态创建
> │   ├── openapi-queries.js      ← OpenAPI 查询辅助层
> │   ├── orchestrate.js          ← 编排器：一键串联全流程
> │   └── index.js                ← 统一入口（兼容旧 api-helpers.js）
> ├── examples/
> │   └── full-workflow.md
> └── 依赖 shared/browser-manager.js（项目根公用层，DOM/API 共用）
> ```

---

## 零、执行架构

### 0.1 双阶段执行模型

```
Phase A — 登录（DOM 模式，~3s）
  使用 `shared/browser-manager.js` 的 `login()` 完成登录 → cookie/session 就绪
  ↓
Phase B — 配置（API 模式，每个 API ~200ms）
  page.evaluate(fetch) → POST /api/... → 解析响应
```

### 0.1b 三层依赖架构

```
shared/browser-manager.js        ← 公用层（项目根，DOM/API 共用）
  ├── launchBrowser()            ← 启动浏览器
  ├── login(page, config)        ← DOM 登录
  ├── closeBrowser(browser)      ← 关闭浏览器
  └── dismissAllPopups(page)     ← 弹窗消除
        ↓
scripts/core.js                  ← API 核心层
  ├── apiPost / apiGet           ← HTTP 请求
  ├── getAuthToken / isSuccess   ← 认证/校验
  └── log                        ← 统一日志
        ↓
scripts/create-*.js              ← 功能模块层
scripts/save-*.js                ← 每个模块导出纯函数，接受 page 参数
scripts/openapi-queries.js       ← 自带独立运行入口
scripts/orchestrate.js           ← 编排层：串联多个模块
```

每个模块有双重角色：
- 作为库：`require('./create-object')` → 导出纯函数，不管理浏览器生命周期
- 独立运行：`node scripts/create-object.js` → 自动启动浏览器→登录→执行→关闭

### 0.2 一次认证，多次调用

登录后 JWT token 存储在 `__auth_token__` cookie 中（583 字符，非 HttpOnly）。

> 🔴 **认证 Bug（已修复）**：`page.evaluate(fetch)` + `credentials: 'include'` 不会自动携带 `__auth_token__` cookie（SameSite=Lax 限制 fetch 跨模式请求）。  
> ✅ **解决方案**：通过 Playwright 的 `page.context().cookies()` API 提取 `__auth_token__`，加入 `Authorization: Bearer <token>` 头传入 `page.evaluate()`。

### 0.3 API 调用模板（带认证修复）

```javascript
// Node.js 侧 — 通过 Playwright page.context().cookies() 获取 token
const { apiPost } = require('./scripts/core');
const result = await apiPost(page, '/api/platform/BasicObject/Save', { name: '测试对象', code: 'test_obj' });
// result: { code: 0, data: { id: '...' } }
```

### 0.4 可视模式 — 自动刷新策略

> API 操作在后台静默执行，浏览器页面不会自动感知数据变化（React state 不会更新）。  
> 开启「可视模式」后，每 15 秒自动刷新当前页面，让用户实时看到配置结果。

**启用方式** — 调用 visibility.js 的 `enableVisibility()` 函数：

```javascript
// Node.js 侧 — 导入 visibility 模块
const { enableVisibility } = require('./scripts/visibility');
await enableVisibility(page, 15000);
// 浏览器页面将每 15 秒自动刷新
```
```

**搭配导航**：在每轮 API 批量操作前，先 navigate 到目标模块页面，让刷新展示正确内容：

```javascript
// 示例：创建字段前先导航到字段管理页
await page.goto('https://standard-val.aksoegmp.com/admin/config/basic-objects/edit/fields?id=对象ID');
// 启动可视刷新
await page.evaluate(() => {
  if (window.__aksoRefreshId) clearInterval(window.__aksoRefreshId);
  window.__aksoRefreshId = setInterval(() => location.reload(), 15000);
});
// 然后批量 API 创建字段...
```

**关闭方式**：

```javascript
await page.evaluate(() => {
  if (window.__aksoRefreshId) { clearInterval(window.__aksoRefreshId); window.__aksoRefreshId = null; }
});
```

> ⚠️ **刷新风险**：页面刷新会中断正在进行的 `page.evaluate()` 调用。建议：
> - API 批量操作完成后启动刷新（而非操作期间）
> - 或使用 `page.evaluate(fetch)` 调用 API（不受页面刷新影响，因为 fetch 在 Playwright 服务端执行）

### 0.5 API 响应通用格式

```json
{ "code": 0, "errorCode": 0, "message": null, "data": "...", "requestID": "...", "traceId": "..." }
```

| code | 含义 |
|------|------|
| `0` | 成功 |
| `500` | 业务错误（message 含描述）|
| 非 200 | 网络/认证错误 |

| code | 含义 | 来源 |
|------|------|------|
| `0` | 成功 | — |
| `500` | 业务错误（message 含描述）| — |
| `401` | 无权限/令牌过期 | 标准API文档 §3.4 |
| `403` | 未访问到 | 标准API文档 §3.4 |
| `518` | 配置迁移中 | 标准API文档 §3.4 |
| `1000` | 参数验证错误 | 标准API文档 §3.4 |
| `10000` | 授权码无效 | 标准API文档 §3.4 |

---

## 一、认证模块（DOM 模式前置）

### 1.1 环境信息

> 从 `d:/akso/akso_claw/AksoGMP_配置环境清单.xlsx` 读取。

### 1.2 登录（一键完成，~3s）

```javascript
// 方式一：直接运行 login.js
// node .trae/skills/akso-basic-config/scripts/login.js --baseUrl <url> --username <user> --password <pass>

// 方式二：在 Node.js 脚本中引入
const { launchBrowser, login, closeBrowser } = require('../../shared/browser-manager');
const { browser, page } = await launchBrowser();
await login(page, { baseUrl, username, password });
// 登录完成，page 已就绪
```

### 1.3 登录 + 开启可视模式（推荐组合）

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { enableVisibility } = require('./scripts/visibility');

const { browser, page } = await launchBrowser();
await login(page, { baseUrl, username, password });
await enableVisibility(page, 15000);
// 登录完成 + 可视模式已开启
```

> ⚠️ 密码使用 RSA 公钥加密，API 层面无法直接构造，因此登录始终走 DOM。

---

## 二、⭐ 对象 — SaveBasicObject

> **Base URL**：`https://standard-val.aksoegmp.com`  
> **所有请求**：`POST` + `Content-Type: application/json`  
> **标注**：⭐ = 核心创建/保存接口

```
POST /api/platform/BasicObject/SaveBasicObject

请求体参数：
  name:              string   ✅ 中文名
  code:              string   ✅ __c 结尾，如 "obj_code__c"
  source:            3        ✅ 固定
  status:            1        ✅ 1=启用
  objectClass:       1        ✅ 1=基础对象
  enableLifeCycle:   bool     ✅ 生命周期开关（不可逆！）
  enableSignatures:  bool       电子签名
  summaryFields:     []        摘要字段

响应：{ code: 0, data: true }   ⚠️ 不返回 objectId！
```

**获取 objectId**：创建对象后 navigate 到对象列表 → 从 DOM 或 URL 参数 `?id=` 提取。

> 💡 **获取 objectId**：SaveBasicObject 不返回 objectId。创建对象后，使用 [§11.1 获取对象信息](#111-获取对象信息) 通过 code 反查 objectId 和 lifecycleId。

### 2.2 代码示例

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { createObject } = require('./scripts/create-object');
const { getObjectInfo } = require('./scripts/openapi-queries');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });
  
  const result = await createObject(page, {
    name: '变更控制', code: 'change_control__c', enableLifeCycle: true
  });
  console.log(result); // → { success: true, message: '对象创建成功' }
  
  const info = await getObjectInfo(page, 'change_control__c');
  console.log('objectId:', info.objectId, 'lifecycleId:', info.lifecycleId);
  
  await closeBrowser(browser);
})();
```

---

## 三、⭐ 选项集 — ObjectPicklist/save

```
POST /api/platform/ObjectPicklist/save

请求体：
{
  "name": "选项集名称",
  "code": "picklist_code__c",
  "options": [
    { "name":"选项A","code":"a__c","status":1,"operations":1,"sort":0 },
    { "name":"选项B","code":"b__c","status":1,"operations":1,"sort":1 }
  ]
}

响应：{ code: 0, data: true }
```

| 参数 | 说明 |
|------|------|
| `options[].status` | `1`=启用 |
| `options[].operations` | `1`=允许操作 |
| `options[].sort` | 排序序号（从 0 开始） |

> 💡 **验证选项集**：创建选项集后，使用 [§11.3 查询选项集选项值](#113-查询选项集选项值) 验证选项值是否正确。

### 3.2 代码示例

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { createPicklist } = require('./scripts/create-picklist');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page);
  
  const result = await createPicklist(page, {
    name: '变更类型', code: 'change_type__c',
    options: [
      { name: '主要变更', code: 'major__c', status: 1, operations: 1, sort: 0 },
      { name: '次要变更', code: 'minor__c', status: 1, operations: 1, sort: 1 }
    ]
  });
  console.log(result); // → { success: true, message: '选项集[变更类型]创建成功' }
  
  await closeBrowser(browser);
})();
```

---

## 四、⭐ 字段 — SaveField

```
POST /api/platform/BasicObject/SaveField

通用参数（所有类型）：
  name:              string   ✅ 字段中文名
  code:              string   ✅ __c 结尾
  dataType:          int      ✅ 见 4.1 枚举表
  objectId:          uuid     ✅ 所属对象 ID
  isRequired:        bool       必填
  invisible:         bool       隐藏
  disabled:          bool       禁用
  statisticsArrange: { id: 1 }  固定
  __observed:        uuid       可选（乐观锁）

响应：{ code: 0, data: true }
```

### 4.1 完整 dataType 枚举（14/16 已确认）

| dataType | 字段类型 | 特有参数 | 状态 |
|----------|---------|---------|------|
| 1 | **文本** | `maxLength`, `format` | ✅ P1 |
| 2 | **数字** | `max`, `min`, `decimalPlaces`, `format` | ✅ P2 |
| 3 | **是-否（布尔）** | — | ✅ P2 |
| 4 | **选项** | `picklistId`, `setDefaultValue` | ✅ P1 |
| 5 | **日期** | `format: "YYYY-MM-DD"` | ✅ P2 |
| 7 | **日期时间** | `format: "YYYY-MM-DD HH:mm:ss"` | ✅ P2 |
| 8 | **附件** | `attachmentCount`, `attachmentSize`, `attachmentExtension` | ✅ P2 |
| 13 | **查找** | `findRelationshipId`, `findSourceFieldId` | ✅ P2 |
| 14 | **公式** | `returnType`, `formulaScript`, `setDefaultValue` | ✅ P2 |
| 15 | **对象（查找）** | `referenceObjectId`, `objectRelation` | ✅ P2 |
| 16 | **父对象** | `referenceObjectId`, `objectRelation: {}` | ✅ P2 |
| 17 | **长文本** | `maxLength` | ✅ P2 |
| 18 | **富文本** | — | ✅ P2 |
| 23 | **对象多选** | `referenceObjectId`, `objectRelation` | ✅ P2 |

> ⚠️ 文件、自动编号、统计字段（3 种）待 Phase 3 补录。

### 4.2 各类型请求体示例

**数字 (dataType=2)**：
```json
{ "name":"数量","code":"qty__c","dataType":2,"objectId":"...","max":999999,"min":0,"decimalPlaces":2,"isRequired":true, "statisticsArrange":{"id":1} }
```

**查找 (dataType=13)**：
```json
{ "name":"关联产品","code":"product_lookup__c","dataType":13,"objectId":"...","findRelationshipId":"relation_uuid","findSourceFieldId":"source_field_uuid", "statisticsArrange":{"id":1} }
```

**对象 (dataType=15)**：
```json
{ "name":"关联变更","code":"related_change__c","dataType":15,"objectId":"...","referenceObjectId":"target_obj_id","objectRelation":{"controlField":null}, "statisticsArrange":{"id":1} }
```
> 注意：isRequired 自动为 true（不可取消）

**父对象 (dataType=16)**：
```json
{ "name":"父对象","code":"parent__c","dataType":16,"objectId":"...","referenceObjectId":"parent_obj_id","objectRelation":{}, "statisticsArrange":{"id":1} }
```
> 注意：isRequired 自动为 false（无必填选项）

**附件 (dataType=8)**：
```json
{ "name":"附件","code":"attachment__c","dataType":8,"objectId":"...","attachmentCount":5,"attachmentSize":10,"attachmentExtension":"pdf|doc|png", "statisticsArrange":{"id":1} }
```

**公式 (dataType=14)**：
```json
{ "name":"计算结果","code":"calc_result__c","dataType":14,"objectId":"...","returnType":2,"formulaScript":null,"setDefaultValue":null, "statisticsArrange":{"id":1} }
```

### 4.3 字段列表查询

```
POST /api/platform/BasicObject/FieldPage

请求：{ objectId, pageIndex:1, pageSize:50, filters:{} }
响应：data.items[] 含 id/name/code/dataType/picklistId 等 50+ 属性
```

> 💡 **验证字段**：创建字段后，使用 [§11.2 查询字段列表](#112-查询字段列表) 验证字段数量和名称是否符合预期。

### 4.4 代码示例

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { createTextField, createNumberField, createDateField, queryFields } = require('./scripts/create-field');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page);
  
  const objectId = '对象UUID';
  
  await createTextField(page, { objectId, name: '编号', code: 'no__c', isRequired: true });
  await createTextField(page, { objectId, name: '标题', code: 'title__c', isRequired: true });
  await createNumberField(page, { objectId, name: '数量', code: 'qty__c', extras: { max: 999999, min: 0, decimalPlaces: 2 } });
  await createDateField(page, { objectId, name: '发生日期', code: 'happen_date__c' });
  
  const fields = await queryFields(page, objectId);
  console.log('字段总数:', fields.total);
  
  await closeBrowser(browser);
})();
```

---

## 五、⭐ 表单布局 — Layout/SaveLayoutDetail

```
POST /api/platform/Layout/SaveLayoutDetail

核心结构：
{
  "id":           "布局ID（新建时可省略）",
  "objectId":     "对象UUID",
  "code":         "layout_code",
  "name":         "布局名称",
  "source":       2,
  "status":       1,
  "objectTypeId": "对象类型UUID",
  "isMain":       true,
  "labelCol":     0,
  "sections": [
    {
      "id":          "section_uuid",
      "code":        "section_code__cs",
      "name":        "分区名称",
      "type":        1,              // 1=标准分区, 4=工作流时间线
      "columnsNum":  2
    }
  ],
  "controls": [
    {
      "id":         "control_uuid",
      "sectionId":  "所属section UUID",
      "code":       "字段code",
      "name":       "字段显示名",
      "fieldId":    "字段UUID",
      "type":       "组件类型（见下表）",
      "gridSpan":   1,
      "attrs":      {}
    }
  ],
  "pages":      [],
  "rules":      [],
  "activePageCode":   null,
  "activeSectionCode": null
}
```

**control.type 组件映射：**

| type | 对应字段 |
|------|---------|
| (空/默认) | 文本/数字/日期等基础类型 |
| `AKRichTextEditor` | 富文本 |
| `AKDateTime` | 日期/日期时间 |
| `AKSelectorObjectMulti` | 对象多选 |
| `AKFile` | 附件/文件 |

### 5.2 代码示例

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { saveFormLayout } = require('./scripts/save-form-layout');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page);
  
  const result = await saveFormLayout(page, {
    objectId: '对象UUID',
    objectTypeId: '对象类型UUID',
    name: '主表单布局',
    code: 'layout_main_form',
    sections: [{ id: 'sec1', code: 'sec1__cs', name: '基本信息', type: 1, columnsNum: 2 }],
    controls: [{
      id: 'ctrl1', sectionId: 'sec1',
      code: 'no__c', name: '编号', fieldId: '字段UUID',
      type: '', gridSpan: 1, attrs: {}
    }]
  });
  console.log(result.message); // → '布局[主表单布局]保存成功'
  
  await closeBrowser(browser);
})();
```

---

## 六、⭐ 列表布局 — Listlayout

```
-- 步骤1：创建列表布局
POST /api/platform/Listlayout/Save
请求：{ status:1, source:3, sortFields:[], name:"列表名", code:"code__c", objectTypeId:"uuid", objectId:"uuid" }
响应：data: { id: "新建UUID" }  ⚠️ 返回对象非字符串！取 resp.data.id

-- 步骤2：添加显示列
POST /api/platform/Listlayout/AddColumns
请求：
{
  "listlayoutId": "上一步返回的UUID",
  "listlayoutColumns": [
    { "fieldId":"字段UUID", "fieldPath":"字段code", "sort":1 },
    { "fieldId":"字段UUID", "fieldPath":"字段code", "sort":2 }
  ]
}
响应：{ code: 0, data: true }
```

### 6.3 代码示例

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { saveListLayout, addListColumns } = require('./scripts/save-list-layout');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page);
  
  const r = await saveListLayout(page, {
    name: '变更列表', code: 'list_change_list',
    objectId: '对象UUID', objectTypeId: '对象UUID'
  });
  if (r.success) {
    await addListColumns(page, r.layoutId, [
      { fieldId: '字段UUID1', fieldPath: 'no__c', sort: 1 },
      { fieldId: '字段UUID2', fieldPath: 'title__c', sort: 2 }
    ]);
    console.log('列表布局创建完成');
  }
  
  await closeBrowser(browser);
})();
```

---

## 七、生命周期（扩展）

### 7.1 ⭐ 生命周期状态 — Status/Create ✅

```
POST /api/config/lifecycle/Status/Create

请求体：
{
  "code":                 "status_code__c",
  "name":                 "状态中文名",
  "lifecycleId":          "生命周期UUID",
  "isEnabled":            true,
  "isRecordDeactivate":   false,
  "description":          "",
  "source":               3,
  "workflowCancelStatus": "11515107-dce6-4ef1-8d51-b1ffed22040f"
}

响应：data: "新创建的状态UUID"
```

> lifecycleId 在对象创建（勾选 enableLifeCycle）时由系统自动生成。从对象详情页 URL 提取：`/admin/config/lifecycle/{lifecycleId}?__edit=2`

### 7.2 生命周期查询 API（8 个已捕获，⚠️ 待验证）

> ⚠️ 以下 API 已从浏览器 Network 面板捕获到请求路径，但**参数和响应格式未完全确认**。  
> 调用前建议先用 `page.evaluate(fetch)` 试探性查询，根据响应调整请求体。

| API | 用途 | 已知请求路径 |
|-----|------|------------|
| `POST /config/power/LifecycleRole/Get` | 角色查询 | ⚠️ 待验证 |
| `POST /config/power/LifestatusUserAction/Get` | 用户动作查询 | ⚠️ 待验证 |
| `POST /config/power/LifestatusRelation/Get` | 状态关联查询 | ⚠️ 待验证 |
| `POST /config/power/LifestatusWorkflow/Get` | 关联工作流查询 | ⚠️ 待验证 |
| `POST /config/power/LifestatusApproveMatrix/Get` | 审批矩阵查询 | ⚠️ 待验证 |
| `POST /config/power/PowerSetLifeStatusObjectAction/Get` | 对象动作查询 | ⚠️ 待验证 |
| `POST /config/power/LifestatusAffixField/Get` | 附件字段查询 | ⚠️ 待验证 |
| `POST /config/power/LifestatusObjectField/Get` | 对象字段查询 | ⚠️ 待验证 |

### 7.3 状态连线 API ❌ 待探索

> **当前状态**：生命周期状态之间的连线（transition）API 尚未捕获。  
> **探索方向**：在实时会话中进入「对象生命周期」页面 → 创建/"连接"两个状态 → 打开浏览器 DevTools Network 面板录制 `POST` 请求。  
> **预期端点**：可能类似 `/api/config/lifecycle/StatusTransition/Create` 或 `/api/config/lifecycle/StatusRelation/Save`。  
> **操作指引**：
> 1. `browser_navigate` → `/admin/config/lifecycle`
> 2. 点击目标生命周期 → 进入编辑画布
> 3. 在画布上创建状态连线
> 4. 在浏览器会话外用 Playwright 监听 Network 请求
> 5. 录制到的 `POST` 请求即该 API 的请求模板

### 7.4 其他生命周期待探索项

| 功能 | 成熟度 | 说明 |
|------|--------|------|
| 用户动作创建 | ❌ 待探索 | 为状态添加"提交""审批通过""退回"等动作按钮 |
| 阶段组配置 | ❌ 待探索 | `/admin/config/stage-group`，API 未捕获 |
| 进入动作配置 | ❌ 待探索 | 状态进入时自动执行的操作（通知/更新字段/创建记录） |
| 对象生命周期整体保存 | ❌ 待探索 | 画布级别的整体保存 API（含所有状态+连线+动作） |

> 💡 **验证状态**：创建生命周期状态后，使用 [§11.4 查询生命周期状态](#114-查询生命周期状态) 验证状态列表是否完整。

### 7.5 代码示例

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { createLifecycleStatus } = require('./scripts/create-lifecycle-status');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page);
  
  const lifecycleId = '生命周期UUID';
  const statuses = [
    { name: '草稿', code: 'status_draft__c' },
    { name: '待审批', code: 'status_pending__c' },
    { name: '已完成', code: 'status_done__c' },
    { name: '已关闭', code: 'status_closed__c' }
  ];
  for (const s of statuses) {
    const r = await createLifecycleStatus(page, { lifecycleId, ...s });
    console.log(r.message);
  }
  
  await closeBrowser(browser);
})();
```

---

## 八、工作流（API 探索）

> ⚠️ 工作流模块的 API 探索处于早期阶段。目前仅确认了查询端点，创建 API 尚未捕获。

### 8.1 工作流创建 API ❌ 待探索

> **当前状态**：工作流（Workflow）的创建/保存 API 尚未录制。  
> **探索方式**：需要在实时浏览器会话中，导航到工作流配置页面（`/admin/config/workflow`），配合 DevTools Network 面板录制 `POST` 请求。

**探索步骤**：
1. `browser_navigate` → `/admin/config/workflow`
2. 点击「创建」按钮 → 填写名称/Code
3. 从工具栏拖拽节点（参与者、任务、判断、通知、电子签名）到画布
4. 用连线连接节点形成完整流程
5. 点击「保存」（或「保存并激活」）时录制 Network 中的 `POST` 请求

**已知工作流查询端点路标**：

| API | 已知路径 | 成熟度 |
|-----|---------|--------|
| 工作流列表查询 | `/api/config/workflow/QueryList`（推测） | ❌ 待探索 |
| 工作流节点查询 | `/api/config/workflow/Node/Get`（推测） | ❌ 待探索 |
| 关联工作流查询 | `/config/power/LifestatusWorkflow/Get` | ⚠️ 待验证（见七.2） |

### 8.1b 工作流与生命周期绑定 API ❌ 待探索
工作流通过"触发条件 = 状态变更时 + 对象 + 生命周期动作"来绑定到生命周期。
此绑定关系可能在两个位置创建：
1. 工作流编辑器中设置触发条件（创建/更新工作流 API 中作为参数）
2. 生命周期配置中关联工作流（状态属性面板）

**探索步骤**：在 DOM Skill 指导下完成 DOM 操作（8.2 步骤 3），同时打开 DevTools Network 面板录制 POST 请求。重点关注请求体中出现的 lifecycleStatusId、userActionId、workflowId 等关联字段。

### 8.2 工作流设置 API ❌ 待探索

> 工作流全局设置页面 `/admin/config/workflow-setting` 的相关 API 未捕获。

---

## 九、菜单与权限（API 探索）

### 9.1 菜单 API ❌ 待探索

> **当前状态**：菜单（Menu）的创建/编辑 API 尚未录制。仅确认菜单组查询端点。

**已知路径**：

| API | 路径 | 成熟度 |
|-----|------|--------|
| 菜单组查询 | `POST /platform/MenuGroup/QueryList` | ⚠️ 待验证 |
| 菜单创建 | 推测 `/api/platform/Menu/Save` 或类似路径 | ❌ 待探索 |
| 菜单集查询 | 推测 `/api/platform/MenuCollection/QueryList` | ❌ 待探索 |

**探索步骤**：
1. `browser_navigate` → `/admin/config/menu-mgmt`
2. 选择父菜单 → 点击「添加子菜单」
3. 填写菜单名称、类型、关联对象、使用布局
4. 点击「保存」时录制 Network 中的 `POST` 请求

### 9.2 权限 API ❌ 待探索

> **当前状态**：权限集（Permission Set）、字段级安全（Field Security）、动态权限控制等模块的 API 均未捕获。

| 功能 | 路由页面 | 成熟度 |
|------|---------|--------|
| 权限集创建/编辑 | `/admin/config/permission-set`（推测） | ❌ 待探索 |
| 字段安全配置 | `/admin/config/field-security`（推测） | ❌ 待探索 |
| 角色权限分配 | `/admin/config/role-permission`（推测） | ❌ 待探索 |

> 权限相关 API 需要在实时会话中通过 DevTools Network 面板录制，目前暂无可用端点。

---

## 十、执行策略

### 10.1 API 成熟度总览（按模块）

| 配置项 | API | 成熟度 | 说明 | 查询验证 API |
|--------|-----|--------|------|-------------|
| 对象创建 | SaveBasicObject | ✅ 已支持 | 请求/响应格式完整确认 | `getObjectInfo(code)` |
| 字段创建 | SaveField (14/16) | ✅ 已支持 | dataType 矩阵完整，3 种类型待补 | `getFieldList(objCode)` |
| 字段查询 | FieldPage | ✅ 已支持 | 分页查询 | — |
| 选项集 | ObjectPicklist/save | ✅ 已支持 | 含选项值批量创建 | `getPicklistOptions(code)` |
| 表单布局 | SaveLayoutDetail | ✅ 已支持 | 含 section + control 完整结构 | — |
| 列表布局 | Listlayout/Save + AddColumns | ✅ 已支持 | 两步创建 | — |
| 生命周期状态 | Status/Create | ✅ 已支持 | 创建状态节点 | `getLifecycleStatus(objCode)` |
| 生命周期 8 个查询 | LifecycleRole/Get 等 | ⚠️ 待验证 | API 路径已捕获，参数/响应未确认 | — |
| Token 刷新 | RefreshToken | ⚠️ 待验证 | `{ "fp": "固定指纹" }` | — |
| 生命周期状态连线 | 未知 | ❌ 待探索 | 需 Network 面板录制 | — |
| 生命周期用户动作 | 未知 | ❌ 待探索 | 创建提交/审批/退回等动作 | — |
| 生命周期阶段组 | 未知 | ❌ 待探索 | `/admin/config/stage-group` | — |
| 工作流创建 | 未知 | ❌ 待探索 | 含节点、连线、激活 | — |
| 工作流节点 | 未知 | ❌ 待探索 | 参与者/任务/判断/通知/签名 | — |
| 菜单创建 | 未知 | ❌ 待探索 | MenuGroup/QueryList 已知 | — |
| 权限集/字段安全 | 未知 | ❌ 待探索 | 含权限集、字段安全、角色分配 | — |
| 编号规则 | 未知 | ❌ 待探索 | 前缀+日期+流水号规则 | — |
| 删除/禁用操作 | 未知 | ❌ 待探索 | 对象/字段/选项集等的删除 API | — |

> 💡 **可视模式提示**：API 批量操作期间，先 navigate 到目标模块页面再开启 15s 自动刷新，操作完成后可直观验证结果。

### 10.2 模块间依赖顺序

```
1. 登录（DOM）→ cookie
2. 创建对象 → 获取 objectId（从页面提取）
3. 创建选项集 → 获取 picklistId（如果要用选项字段）
4. 创建字段 → 需要 objectId（+ picklistId for type=4）
5. 创建表单布局 → 需要 objectId + section + controls + fieldIds
6. 创建列表布局 → 需要 objectId → AddColumns
7. 创建生命周期状态 → 需要 lifecycleId
```

### 10.3 批量编排示例

```javascript
// Node.js — 批量创建对象 + 字段 + 布局（按需导入）
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { createObject } = require('./scripts/create-object');
const { createTextField, createOptionField } = require('./scripts/create-field');
const { createPicklist } = require('./scripts/create-picklist');
const { getObjectInfo } = require('./scripts/openapi-queries');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page);

  // 1. 创建对象
  await createObject(page, { name: '变更控制', code: 'change_ctrl__c', enableLifeCycle: true });

  // 2. 获取 objectId
  const info = await getObjectInfo(page, 'change_ctrl__c');
  const objId = info.objectId;

  // 3. 创建选项集
  const pl = await createPicklist(page, { name: '变更类型', code: 'change_type__c',
    options: [{ name: '主要', code: 'major__c' }, { name: '次要', code: 'minor__c' }] });

  // 4. 批量创建字段
  await createTextField(page, { objectId: objId, name: '编号', code: 'no__c', isRequired: true });
  await createOptionField(page, { objectId: objId, name: '类型', code: 'type__c' });
  await createTextField(page, { objectId: objId, name: '描述', code: 'desc__c' });

  await closeBrowser(browser);
})();
```

> 💡 更简单的做法：使用 `orchestrate.js` 编排器或 `node scripts/orchestrate.js` 一键执行。

### 10.4 幂等性

| API | 幂等 | 说明 |
|-----|------|------|
| SaveBasicObject | ✅ | 基于 code 去重，重复调用更新 |
| SaveField | ✅ | 基于 code 去重 |
| ObjectPicklist/save | ✅ | 基于 code 去重 |
| Status/Create | ❌ | 每次创建新状态 |
| Listlayout/Save | ✅ | 基于 code 去重 |

---

## 命名规范速查

| 类型 | 规则 | 示例 |
|------|------|------|
| 对象 Code | 小写 + 下划线 + `__c` | `change_control__c` |
| 字段 Code | 小写 + 下划线 + `__c` | `applicant__c` |
| 选项集 Code | 小写 + 下划线 + `__c` | `change_type__c` |
| 选项值 Code | 选项缩写 + `__c` | `major__c` |
| 布局 Code | `layout_` 前缀 | `layout_main_form` |
| 列表 Code | `list_` 前缀 | `list_change_list` |
| 状态 Code | 语义化 + `__c` | `draft__c` |

---

## 能力边界

### ✅ 已支持（10 模块 / 12 核心 API + 8 待验证）

| 模块 | API | dataType 覆盖 | 成熟度 |
|------|-----|--------------|--------|
| 认证 | Login (DOM) + RefreshToken | — | ✅ / ⚠️ |
| 对象 | SaveBasicObject | — | ✅ |
| 字段 | SaveField + FieldPage | 14/16 种 | ✅ |
| 选项集 | ObjectPicklist/save | — | ✅ |
| 表单布局 | Layout/SaveLayoutDetail | — | ✅ |
| 列表布局 | Listlayout/Save + AddColumns | — | ✅ |
| 生命周期 | Status/Create | — | ✅ |
| 生命周期查询 | 8 个 Get API | — | ⚠️ 待验证 |
| 菜单查询 | MenuGroup/QueryList | — | ⚠️ 待验证 |
| 对象动作 | BasicObjectAction/QueryList | — | ⚠️ 待验证 |

### ⚠️ 待验证（API 已捕获，参数/响应未确认）

- 生命周期 8 个查询 API（LifecycleRole, LifestatusUserAction, LifestatusRelation, LifestatusWorkflow, LifestatusApproveMatrix, PowerSetLifeStatusObjectAction, LifestatusAffixField, LifestatusObjectField）
- RefreshToken — `{ "fp": "固定指纹" }` 的具体签名机制
- MenuGroup/QueryList — 请求参数格式
- FieldsByCodes — 用于批量字段查询

### ❌ 待探索（需通过 Network 面板录制）

- 字段：文件、自动编号、统计字段（3 种 dataType 未确认）
- 生命周期：状态连线、用户动作创建、阶段组、整体保存
- 工作流：创建节点/连线/激活、全局设置
- 菜单：创建/编辑菜单、菜单集查询
- 权限：权限集、字段级安全、角色权限分配
- 编号规则：导航 /admin/config/code-rules/list → 创建 → 保存时录制 POST 请求（推测 API 路径：/api/platform/CodeRule/Save）
- 删除/禁用操作

### 🔍 可验证（OpenAPI）

| 功能 | 查询 API | 说明 |
|------|----------|------|
| 对象信息 | `GET /api/openapi/v1.0/BasicObject/{code}` | 返回 objectId/lifecycleId/enableLifeCycle |
| 字段列表 | `GET /api/openapi/v1.0/BasicObject/field/{objCode}` | 返回字段数组（含 name/code/dataType/id） |
| 选项集详情 | `GET /api/openapi/v1.0/BasicObject/picklist/{code}` | 返回选项值数组 |
| 生命周期状态 | `GET /api/openapi/v1.0/BasicObject/lifecycleStatus/{objCode}` | 返回状态数组 |
| Token 认证 | `POST /api/openapi/v1.0/Auth` | ⚠️ 明文密码，备用方案 |

---

## 十一、OpenAPI 查询辅助层（基于标准API文档-V1.0）

> **适用场景**：配置后的查询验证、对象/字段 ID 获取、选项集验证。  
> **与管理端 API 的区别**：管理端 API（/api/platform/...、/api/config/...）用于**创建/修改**配置；OpenAPI（/api/openapi/v1.0/...）用于**查询/验证**已有配置。  
> **完整文档**：external_reference_resources/标准API文档-V1.0.md

### 11.1 获取对象信息（解决 objectId 获取痛点）

| 项目 | 内容 |
|------|------|
| 路由 | `GET /api/openapi/v1.0/BasicObject/{code}` |
| 文档来源 | 标准API文档 §4.8 |
| 核心用途 | 通过对象 Code 反查 objectId、lifecycleId |

**请求示例**：

```javascript
// Node.js — API 调用示例
async (page) => {
  const result = await page.evaluate(async () => {
    const { getObjectInfo } = window.__aksoAPI;
    return await getObjectInfo('change_control__c');
  });
  // result.objectId → UUID，用于后续字段创建
  // result.lifecycleId → UUID，用于生命周期配置
  // result.enableLifeCycle → bool
  return result;
}
```

### 11.2 查询字段列表

| 项目 | 内容 |
|------|------|
| 路由 | `GET /api/openapi/v1.0/BasicObject/field/{objectCode}/{fieldCode?}` |
| 文档来源 | 标准API文档 §4.6 |
| 核心用途 | 查询已创建的字段，验证字段创建结果 |

```javascript
const { getFieldList, log } = window.__aksoAPI;
const r = await getFieldList('change_control__c');
log('字段查询', { success: r.success, message: r.count + ' 个字段' });
```

### 11.3 查询选项集选项值

| 项目 | 内容 |
|------|------|
| 路由 | `GET /api/openapi/v1.0/BasicObject/picklist/{code}` |
| 文档来源 | 标准API文档 §4.7 |
| 核心用途 | 验证选项集和选项值是否创建正确 |

```javascript
const { getPicklistOptions } = window.__aksoAPI;
const r = await getPicklistOptions('option_change_type');
// r.items → [{ id, name, code, sort, status }]
```

### 11.4 查询生命周期状态

| 项目 | 内容 |
|------|------|
| 路由 | `GET /api/openapi/v1.0/BasicObject/lifecycleStatus/{objectCode}` |
| 文档来源 | 标准API文档 §4.5 |
| 核心用途 | 通过对象 Code 查询其全部生命周期状态 |

```javascript
const { getLifecycleStatus } = window.__aksoAPI;
const r = await getLifecycleStatus('change_control__c');
// r.items → [{ id, code, name, lifecycleId }]
```

### 11.5 备用 Token 认证（纯 API 模式）

> ⚠️ **安全警告**：此接口使用明文密码传输，仅用于内部自动化场景。生产环境建议继续使用 DOM 登录 + cookie token。

| 项目 | 内容 |
|------|------|
| 路由 | `POST /api/openapi/v1.0/Auth` |
| 文档来源 | 标准API文档 §4.1 |
| 有效期 | 60 分钟 |
| Body | `{ "account": "用户名", "password": "密码" }` |

```javascript
const { getOpenApiToken } = window.__aksoAPI;
const r = await getOpenApiToken('账号', '密码');
if (r.success) {
  // r.token → JWT 字符串，可用于 Authorization: Bearer 头
}
```

### 11.6 OpenAPI 错误码速查

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| 0 | 成功 | — |
| 401 | 无权限/登录过期 | 重新获取 token |
| 403 | 未访问到 | 检查路由和权限 |
| 500 | 统一错误 | 查看 message 详情 |
| 518 | 配置迁移 | 等待迁移完成 |
| 1000 | 参数验证错误 | 检查参数格式 |
| 10000 | 授权码无效 | 检查账号密码 |

---

## 附录：API 路径速查

| 分组 | 路径 | 用途 | 成熟度 |
|------|------|------|--------|
| 🔐 Auth | `/auth/Oauth/Login` | 登录（DOM） | ✅ |
| 🔐 Auth | `/auth/Oauth/RefreshToken` | Token 刷新 | ⚠️ |
| ⭐ Object | `/platform/BasicObject/SaveBasicObject` | 创建对象 | ✅ |
| ⭐ Field | `/platform/BasicObject/SaveField` | 创建字段 | ✅ |
| 📋 Field | `/platform/BasicObject/FieldPage` | 字段查询 | ✅ |
| ⭐ Picklist | `/platform/ObjectPicklist/save` | 创建选项集 | ✅ |
| ⭐ Layout | `/platform/Layout/SaveLayoutDetail` | 表单布局 | ✅ |
| ⭐ List | `/platform/Listlayout/Save` | 列表布局 | ✅ |
| ⭐ List | `/platform/Listlayout/AddColumns` | 添加列 | ✅ |
| ⭐ Lifecycle | `/config/lifecycle/Status/Create` | 创建状态 | ✅ |
| 📋 Lifecycle | `/config/power/LifecycleRole/Get` | 角色查询 | ⚠️ |
| 📋 Lifecycle | `/config/power/LifestatusUserAction/Get` | 用户动作 | ⚠️ |
| 📋 Lifecycle | `/config/power/LifestatusRelation/Get` | 状态关联 | ⚠️ |
| 📋 Lifecycle | `/config/power/LifestatusWorkflow/Get` | 关联工作流 | ⚠️ |
| 📋 Lifecycle | `/config/power/LifestatusApproveMatrix/Get` | 审批矩阵 | ⚠️ |
| 📋 Lifecycle | `/config/power/PowerSetLifeStatusObjectAction/Get` | 对象动作 | ⚠️ |
| 📋 Lifecycle | `/config/power/LifestatusAffixField/Get` | 附件字段 | ⚠️ |
| 📋 Lifecycle | `/config/power/LifestatusObjectField/Get` | 对象字段 | ⚠️ |
| 📋 Query | `/platform/MenuGroup/QueryList` | 菜单组 | ⚠️ |
| 📋 Query | `/platform/biz/basicobject/FieldsByCodes` | 字段查询 | ⚠️ |
| 📋 Query | `/platform/BasicObjectAction/QueryList` | 对象动作 | ⚠️ |
| 📋 OpenAPI | `/api/openapi/v1.0/BasicObject/{code}` | 获取对象信息 | ✅ |
| 📋 OpenAPI | `/api/openapi/v1.0/BasicObject/field/{objCode}` | 获取字段列表 | ✅ |
| 📋 OpenAPI | `/api/openapi/v1.0/BasicObject/picklist/{code}` | 获取选项集 | ✅ |
| 📋 OpenAPI | `/api/openapi/v1.0/BasicObject/lifecycleStatus/{objCode}` | 获取生命周期状态 | ✅ |
| 🔑 OpenAPI | `/api/openapi/v1.0/Auth` | 获取访问令牌（备用） | ✅ |

---

## 附录 E：API 模块速查表

> 所有模块位于 `scripts/` 目录，可通过 `require('./scripts/xxx')` 导入或 `node scripts/xxx.js` 独立运行。

| 文件名 | 功能 | 导出函数 | 可独立运行 |
|--------|------|----------|:----------:|
| `core.js` | 核心工具 | `apiPost`, `apiGet`, `getAuthToken`, `isSuccess`, `log`, `BASE`, `OPENAPI_BASE`, `ERROR_CODES` | — |
| `visibility.js` | 可视模式 | `enableVisibility`, `disableVisibility`, `isVisibilityOn` | ✅ |
| `create-object.js` | 对象创建 | `createObject` | ✅ |
| `create-field.js` | 字段创建 | `createField` + 14 个类型快捷函数 + `queryFields` | ✅ |
| `create-picklist.js` | 选项集创建 | `createPicklist` | ✅ |
| `save-form-layout.js` | 表单布局 | `saveFormLayout` | ✅ |
| `save-list-layout.js` | 列表布局 | `saveListLayout`, `addListColumns` | ✅ |
| `create-lifecycle-status.js` | 生命周期状态 | `createLifecycleStatus` | ✅ |
| `openapi-queries.js` | OpenAPI 查询 | `getOpenApiToken`, `getObjectInfo`, `getFieldList`, `getPicklistOptions`, `getLifecycleStatus` | ✅ |
| `orchestrate.js` | 编排器 | `runFullWorkflow(page, config)` | ✅ |
| `index.js` | 统一入口 | 重新导出以上所有函数（兼容旧 api-helpers.js） | ✅ |

### 使用方式

```bash
# 按需导入
const { createObject } = require('./scripts/create-object');

# 全部导入
const helpers = require('./scripts');

# 独立运行验证
node scripts/create-object.js

# 一键完整工作流
node scripts/orchestrate.js
```

---

> **版本**：v0.5.0  
> **更新**：模块化重构 — scripts/ 拆分为 11 个独立模块（core + 8 功能模块 + 编排器 + index 统一入口），每个模块含 JSDoc 示例和独立运行入口，各章节嵌入代码示例
> **日期**：2026-07-14  
> **数据来源**：2026-07-08 API 录制（Phase 1: 20 POST + Phase 2: 16 新增）  
> **测试环境**：standard-val.aksoegmp.com
