# akso-basic-config-api — 完整工作流示例

> 场景：创建对象 → 添加字段 → 配置生命周期状态  
> 模式：混合（DOM 登录 + API 配置）

---

## 步骤 0：登录（DOM 模式）

```javascript
// browser_run_code_unsafe
async (page) => {
  await page.goto('https://standard-val.aksoegmp.com/login');
  await page.getByRole('textbox', { name: '请输入用户名' }).fill('liyulong');
  await page.frameLocator('iframe').first()
    .getByRole('textbox', { name: '请输入密码' }).fill('密码');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('**/web', { timeout: 15000 });
  return '登录成功';
}
```

## 步骤 1：注入 API 助手

```javascript
// browser_run_code_unsafe — 注入 api-helpers.js
async (page) => {
  await page.evaluate(async () => {
    // 粘贴 scripts/api-helpers.js 的完整内容（或 write 到文件后 evaluate 读取）
    const script = document.createElement('script');
    script.src = 'file:///C:/Users/88450/.workbuddy/skills/akso-basic-config-api/scripts/api-helpers.js';
    document.head.appendChild(script);
  });
  return 'API helpers injected';
}
```

## 步骤 2：创建对象（见第二章 — SaveBasicObject）

```javascript
// browser_run_code_unsafe
async (page) => {
  const result = await page.evaluate(async () => {
    const { createObject } = window.__aksoAPI;
    return await createObject({
      name: '变更控制',
      code: 'change_control__c',
      enableLifeCycle: true
    });
  });
  return result;
}
// → { success: true, message: '对象创建成功' }
```

## 步骤 3：获取对象 ID

```javascript
// 方式 A（推荐）：用 OpenAPI 查询接口获取 ID
// browser_run_code_unsafe
async (page) => {
  const objInfo = await page.evaluate(async () => {
    const { getObjectInfo } = window.__aksoAPI;
    return await getObjectInfo('变更控制对应的code__c');
  });
  return { objectId: objInfo.objectId, lifecycleId: objInfo.lifecycleId };
}
// → { objectId: 'uuid...', lifecycleId: 'uuid...' }

// 方式 B（备选）：导航到对象列表，从页面元素中获取
// browser_navigate → /admin/config/basic-objects/list
// 然后在页面上找到刚创建的对象，点击进入，URL 中的 ?id= 就是 objectId

// 或者用 page.evaluate 遍历表格
async (page) => {
  const objId = await page.evaluate(() => {
    // 在对象列表页面查找 name='变更控制' 的行的 data-row-key
    const rows = document.querySelectorAll('tr[data-row-key]');
    for (const row of rows) {
      if (row.textContent.includes('变更控制')) {
        return row.getAttribute('data-row-key');
      }
    }
    return null;
  });
  return { objectId: objId };
}
```

## 步骤 4：创建字段（见第四章 — SaveField）

```javascript
// browser_run_code_unsafe
async (page) => {
  const results = await page.evaluate(async (objectId) => {
    const { createTextField, createOptionField, log } = window.__aksoAPI;
    
    // 创建文本字段
    const r1 = await createTextField({
      objectId,
      name: '变更编号',
      code: 'change_no__c',
      isRequired: true
    });
    log('文本字段', r1);
    
    // 创建另一个文本字段
    const r2 = await createTextField({
      objectId,
      name: '变更标题',
      code: 'change_title__c',
      isRequired: true
    });
    log('文本字段', r2);
    
    // 创建选项字段（需要先有 picklistId）
    const r3 = await createOptionField({
      objectId,
      name: '变更类型',
      code: 'change_type__c',
      picklistId: '92e50796-6d5e-a3ad-bc34-3a224e2d3086', // 替换为实际选项集 ID
      isRequired: true
    });
    log('选项字段', r3);
    
    return { r1, r2, r3 };
  }, '目标对象ID');
  
  return results;
}
```

## 步骤 5：创建生命周期状态（见第七章 — Status/Create）

```javascript
// browser_run_code_unsafe
async (page) => {
  const results = await page.evaluate(async (lifecycleId) => {
    const { createLifecycleStatus, log } = window.__aksoAPI;
    
    const statuses = [
      { name: '草稿', code: 'status_draft__c' },
      { name: '待审批', code: 'status_pending__c' },
      { name: '审批通过', code: 'status_approved__c' },
      { name: '已关闭', code: 'status_closed__c' }
    ];
    
    const resultList = [];
    for (const s of statuses) {
      const r = await createLifecycleStatus({
        lifecycleId,
        name: s.name,
        code: s.code,
        isEnabled: true
      });
      log(`状态:${s.name}`, r);
      resultList.push(r);
    }
    
    return resultList;
  }, '生命周期ID');
  
  return results;
}
```

---

## 瓶颈：ID 获取

Phase 1 最明显的短板是 **ID 链路**：

```
创建对象 → 不返回 objectId ❌
创建字段 → 需要 objectId
创建状态 → 需要 lifecycleId
```

**当前解决方案**：
1. 创建对象后 navigate 到对象列表页
2. 从 DOM 中查找新对象获取 ID
3. 用 ID 继续后续 API 调用

**Phase 2 改进方向**：
- 实现对象查询 API 调用（如果存在）
- 或者用 page.evaluate 脚本快速从表格提取 ID

---

## 步骤 6：验证配置结果（OpenAPI 查询辅助）

```javascript
// browser_run_code_unsafe — 用 OpenAPI 查询接口验证创建结果
async (page) => {
  const results = await page.evaluate(async () => {
    const { getObjectInfo, getFieldList, getPicklistOptions, getLifecycleStatus, log } = window.__aksoAPI;
    
    // 1. 验证对象创建 + 获取 objectId
    const obj = await getObjectInfo('change_control__c');
    log('对象查询', { success: obj.success, objectId: obj.objectId, lifecycleId: obj.lifecycleId });
    
    // 2. 验证字段列表
    const fields = await getFieldList('change_control__c');
    log('字段查询', { success: fields.success, count: fields.count });
    
    // 3. 验证生命周期状态
    const statuses = await getLifecycleStatus('change_control__c');
    log('状态查询', { success: statuses.success, count: statuses.count });
    
    return { obj, fields, statuses };
  });
  return results;
}
```
