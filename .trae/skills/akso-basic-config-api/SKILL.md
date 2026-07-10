---
name: akso-basic-config-api
display_name: "Akso eGMP 基础配置 — API 直调版"
description: "Akso eGMP 系统基础配置 Skill — API 直调版（Phase 2）。通过 HTTP API 直接创建对象、字段（14/16种类型）、选项集、表单布局、列表布局、生命周期状态，比 DOM 模式快 40x。执行引擎：browser_run_code_unsafe + page.evaluate(fetch)。内置 15s 自动刷新可视模式。覆盖 7 个模块共 12 个核心 API。"
description_zh: "Akso eGMP 基础配置 API 版：通过 HTTP 直调创建对象/字段/选项集/布局/生命周期状态，内置可视刷新，极速配置"
version: 0.2.1
allowed-tools: Bash, Read, Write, Skill, WebFetch
agent_created: true
---

# Akso eGMP 基础配置 — API 直调版 (Phase 2)

> **版本**：v0.2.1 — Phase 2 + 可视模式  
> **适用对象**：WorkBuddy AI Agent  
> **执行入口**：Playwright MCP `browser_run_code_unsafe` → `page.evaluate(fetch)`  
> **原则**：登录走浏览器 DOM，配置走 HTTP API。一次登录，全程 API 直调。  
> **性能**：DOM 模式 2 分钟 → API 模式 3 秒（40x 提速）  
> **覆盖**：7 个模块 / 12 个核心 API / 14 种字段类型  
> **环境信息**：存储于外部 `AksoGMP_配置环境清单.xlsx`，本 Skill 不含密码

> 📂 **文件结构**：
> ```
> akso-basic-config-api/
> ├── SKILL.md          ← 核心指令集 + 完整 API 参考
> ├── scripts/
> │   └── api-helpers.js ← 10 个封装函数
> └── examples/
>     └── full-workflow.md
> ```

---

## 零、执行架构

### 0.1 双阶段执行模型

```
Phase A — 登录（DOM 模式，~3s）
  browser_navigate → fill + click → cookie/session 就绪
  ↓
Phase B — 配置（API 模式，每个 API ~200ms）
  page.evaluate(fetch) → POST /api/... → 解析响应
```

### 0.2 一次认证，多次调用

登录后 JWT token 存储在 `__auth_token__` cookie 中（583 字符，非 HttpOnly）。

> 🔴 **认证 Bug（已修复）**：`page.evaluate(fetch)` + `credentials: 'include'` 不会自动携带 `__auth_token__` cookie（SameSite=Lax 限制 fetch 跨模式请求）。  
> ✅ **解决方案**：必须手动从 `document.cookie` 提取 `__auth_token__`，加入 `Authorization: Bearer <token>` 头。

### 0.3 API 调用模板（带认证修复）

```javascript
// browser_run_code_unsafe 中执行 — 必须包含 token 提取
async (page) => {
  const result = await page.evaluate(async (apiPath, body) => {
    // 🔑 从 cookie 提取 token 作为 Bearer 头
    const getCookie = (name) => {
      const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return m ? m[2] : null;
    };
    const token = getCookie('__auth_token__');

    const resp = await fetch('https://standard-val.aksoegmp.com' + apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token    // ← 必须！
      },
      body: JSON.stringify(body)
    });
    return await resp.json();
  }, '/api/...', { /* request body */ });
  return result;  // { code: 0, data: ... }
}
```

### 0.4 可视模式 — 自动刷新策略

> API 操作在后台静默执行，浏览器页面不会自动感知数据变化（React state 不会更新）。  
> 开启「可视模式」后，每 15 秒自动刷新当前页面，让用户实时看到配置结果。

**启用方式** — 在登录完成后注入刷新定时器：

```javascript
// browser_run_code_unsafe — 登录后立即执行
async (page) => {
  // 注入 15 秒自动刷新
  await page.evaluate(() => {
    if (window.__aksoRefreshId) clearInterval(window.__aksoRefreshId);
    window.__aksoRefreshId = setInterval(() => {
      console.log('[可视模式] 刷新页面...');
      location.reload();
    }, 15000);
  });
  return '可视模式已开启，每 15 秒刷新一次';
}
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
> - 或使用 `browser_run_code_unsafe` 调用 API（不受页面刷新影响，因为 fetch 在 Playwright 服务端执行）

### 0.5 API 响应通用格式

```json
{ "code": 0, "errorCode": 0, "message": null, "data": "...", "requestID": "...", "traceId": "..." }
```

| code | 含义 |
|------|------|
| `0` | 成功 |
| `500` | 业务错误（message 含描述）|
| 非 200 | 网络/认证错误 |

---

## 一、认证模块（DOM 模式前置）

### 1.1 环境信息

> 从 `d:/akso/akso_claw/AksoGMP_配置环境清单.xlsx` 读取。

### 1.2 登录（一发入魂，~3s）

```
browser_run_code_unsafe code：
  async (page) => {
    await page.goto('https://standard-val.aksoegmp.com/login');
    await page.getByRole('textbox', { name: '请输入用户名' }).fill('账号');
    await page.frameLocator('iframe').first()
      .getByRole('textbox', { name: '请输入密码' }).fill('密码');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/web', { timeout: 15000 });
    return 'OK: ' + page.url();
  }
```

### 1.3 登录 + 开启可视模式（推荐组合）

```
browser_run_code_unsafe code：
  async (page) => {
    // 登录
    await page.goto('https://standard-val.aksoegmp.com/login');
    await page.getByRole('textbox', { name: '请输入用户名' }).fill('账号');
    await page.frameLocator('iframe').first()
      .getByRole('textbox', { name: '请输入密码' }).fill('密码');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/web', { timeout: 15000 });
    
    // 开启可视模式
    await page.evaluate(() => {
      if (window.__aksoRefreshId) clearInterval(window.__aksoRefreshId);
      window.__aksoRefreshId = setInterval(() => location.reload(), 15000);
    });
    
    return '登录成功 + 可视模式已开启: ' + page.url();
  }
```

> ⚠️ 密码使用 RSA 公钥加密，API 层面无法直接构造，因此登录始终走 DOM。

---

## 二、API 参考手册

> **Base URL**：`https://standard-val.aksoegmp.com`  
> **所有请求**：`POST` + `Content-Type: application/json`  
> **标注**：⭐ = 核心创建/保存接口

### 2.1 认证

| API | 说明 |
|-----|------|
| `POST /api/auth/Oauth/Login` | 登录（pwd 已 RSA 加密，走 DOM） |
| `POST /api/auth/Oauth/RefreshToken` | Token 刷新：`{ "fp": "固定指纹" }` |

### 2.2 ⭐ 对象 — SaveBasicObject

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

### 2.3 ⭐ 字段 — SaveField

```
POST /api/platform/BasicObject/SaveField

通用参数（所有类型）：
  name:              string   ✅ 字段中文名
  code:              string   ✅ __c 结尾
  dataType:          int      ✅ 见 2.3.2 枚举表
  objectId:          uuid     ✅ 所属对象 ID
  isRequired:        bool       必填
  invisible:         bool       隐藏
  disabled:          bool       禁用
  statisticsArrange: { id: 1 }  固定
  __observed:        uuid       可选（乐观锁）

响应：{ code: 0, data: true }
```

#### 2.3.2 完整 dataType 枚举（14/16 已确认）

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

#### 2.3.3 各类型请求体示例

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

#### 2.3.4 字段列表查询

```
POST /api/platform/BasicObject/FieldPage

请求：{ objectId, pageIndex:1, pageSize:50, filters:{} }
响应：data.items[] 含 id/name/code/dataType/picklistId 等 50+ 属性
```

### 2.4 ⭐ 选项集 — ObjectPicklist/save

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

### 2.5 ⭐ 表单布局 — Layout/SaveLayoutDetail

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

### 2.6 ⭐ 列表布局 — Listlayout

```
-- 步骤1：创建列表布局
POST /api/platform/Listlayout/Save
请求：{ status:1, source:3, sortFields:[], name:"列表名", code:"code__c", objectTypeId:"uuid", objectId:"uuid" }
响应：data: "新建的 listlayoutId"

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

### 2.7 ⭐ 生命周期状态 — Status/Create

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

### 2.8 生命周期查询 API（已捕获，未深入）

| API | 用途 |
|-----|------|
| `POST /config/power/LifecycleRole/Get` | 角色 |
| `POST /config/power/LifestatusUserAction/Get` | 用户动作 |
| `POST /config/power/LifestatusRelation/Get` | 状态关联 |
| `POST /config/power/LifestatusWorkflow/Get` | 关联工作流 |
| `POST /config/power/LifestatusApproveMatrix/Get` | 审批矩阵 |
| `POST /config/power/PowerSetLifeStatusObjectAction/Get` | 对象动作 |
| `POST /config/power/LifestatusAffixField/Get` | 附件字段 |
| `POST /config/power/LifestatusObjectField/Get` | 对象字段 |

---

## 三、标准工作流

### 3.1 模块间依赖顺序

```
1. 登录（DOM）→ cookie
2. 创建对象 → 获取 objectId（从页面提取）
3. 创建选项集 → 获取 picklistId（如果要用选项字段）
4. 创建字段 → 需要 objectId（+ picklistId for type=4）
5. 创建表单布局 → 需要 objectId + section + controls + fieldIds
6. 创建列表布局 → 需要 objectId → AddColumns
7. 创建生命周期状态 → 需要 lifecycleId
```

### 3.2 一气呵成脚本（注入 api-helpers.js 后执行）

```javascript
// browser_run_code_unsafe — 批量创建对象 + 字段 + 布局
async (page) => {
  // 注入 helpers（从 scripts/api-helpers.js 加载）
  await page.evaluate(fs.readFileSync('.../api-helpers.js', 'utf-8'));
  
  const results = await page.evaluate(async () => {
    const { createObject, createTextField, createOptionField,
            createPicklist, saveFormLayout, saveListLayout } = window.__aksoAPI;
    const log = window.__aksoAPI.log;
    const objId = '对象UUID';  // 预先准备
    
    // 1. 创建对象
    await createObject({ name:'变更控制', code:'change_ctrl__c', enableLifeCycle:true });
    
    // 2. 创建选项集
    const pl = await createPicklist({ name:'变更类型', code:'change_type__c',
      options: [{name:'主要',code:'major__c'},{name:'次要',code:'minor__c'}] });
    
    // 3. 批量创建字段
    await createTextField({ objectId:objId, name:'编号', code:'no__c', isRequired:true });
    await createOptionField({ objectId:objId, name:'类型', code:'type__c', picklistId:pl.id });
    await createTextField({ objectId:objId, name:'描述', code:'desc__c' });
    
    return 'Done';
  });
  return results;
}
```

---

## 四、执行策略

### 4.1 API vs DOM 模式选择

| 场景 | 推荐 | 原因 |
|------|------|------|
| 登录 | ⚠️ DOM | 密码 RSA 加密 |
| **登录 + 可视** | ⚠️ DOM | 追加 15s 自动刷新（见 1.3） |
| 创建对象 | ✅ API | SaveBasicObject |
| 创建字段（14 种） | ✅ API | dataType 矩阵完整 |
| 创建选项集 | ✅ API | ObjectPicklist/save |
| 表单布局 | ✅ API | SaveLayoutDetail |
| 列表布局 | ✅ API | Listlayout/Save + AddColumns |
| 生命周期状态 | ✅ API | Status/Create |
| 生命周期动作 | ⚠️ DOM | API 待 Phase 3 补录 |
| 工作流 | ⚠️ DOM | API 待 Phase 3 补录 |
| 菜单 | ⚠️ DOM | API 待 Phase 3 补录 |

> 💡 **可视模式提示**：API 批量操作期间，先 navigate 到目标模块页面再开启 15s 自动刷新，操作完成后可直观验证结果。

### 4.2 幂等性

| API | 幂等 | 说明 |
|-----|------|------|
| SaveBasicObject | ✅ | 基于 code 去重，重复调用更新 |
| SaveField | ✅ | 基于 code 去重 |
| ObjectPicklist/save | ✅ | 基于 code 去重 |
| Status/Create | ❌ | 每次创建新状态 |
| Listlayout/Save | ✅ | 基于 code 去重 |

---

## 五、命名规范速查

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

## 六、能力边界

### ✅ Phase 2 已支持（7 模块 / 12 API）

| 模块 | API | dataType 覆盖 |
|------|-----|--------------|
| 认证 | Login (DOM) + RefreshToken | — |
| 对象 | SaveBasicObject | — |
| 字段 | SaveField + FieldPage | 14/16 种 |
| 选项集 | ObjectPicklist/save | — |
| 表单布局 | Layout/SaveLayoutDetail | — |
| 列表布局 | Listlayout/Save + AddColumns | — |
| 生命周期 | Status/Create + 8 个查询 API | — |

### ❌ 待 Phase 3

- 字段：文件、自动编号、统计字段（3 种 dataType 未确认）
- 生命周期：用户动作创建、关系连线
- 工作流：完整创建流程
- 菜单：创建 + 关联对象/布局
- 删���/禁用操作

---

## 附录：API 路径速查

| 分组 | 路径 | 用途 |
|------|------|------|
| 🔐 Auth | `/auth/Oauth/Login` | 登录 |
| 🔐 Auth | `/auth/Oauth/RefreshToken` | Token 刷新 |
| ⭐ Object | `/platform/BasicObject/SaveBasicObject` | 创建对象 |
| ⭐ Field | `/platform/BasicObject/SaveField` | 创建字段 |
| 📋 Field | `/platform/BasicObject/FieldPage` | 字段查询 |
| ⭐ Picklist | `/platform/ObjectPicklist/save` | 创建选项集 |
| ⭐ Layout | `/platform/Layout/SaveLayoutDetail` | 表单布局 |
| ⭐ List | `/platform/Listlayout/Save` | 列表布局 |
| ⭐ List | `/platform/Listlayout/AddColumns` | 添加列 |
| ⭐ Lifecycle | `/config/lifecycle/Status/Create` | 创建状态 |
| 📋 Query | `/platform/MenuGroup/QueryList` | 菜单组 |
| 📋 Query | `/platform/biz/basicobject/FieldsByCodes` | 字段查询 |
| 📋 Query | `/platform/BasicObjectAction/QueryList` | 对象动作 |

---

> **版本**：v0.2.1  
> **更新**：补录选项集/表单布局/列表布局 API + 完整 dataType 枚举(14/16) + 15s 自动刷新可视模式  
> **数据来源**：2026-07-08 API 录制（Phase 1: 20 POST + Phase 2: 16 新增）  
> **测试环境**：standard-val.aksoegmp.com
