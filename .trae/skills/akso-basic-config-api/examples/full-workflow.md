# akso-basic-config-api — 完整工作流示例

> 场景：创建对象 → 添加字段 → 配置生命周期状态  
> 模式：Node.js require 模块 + shared/browser-manager.js

---

## 方式一：按需导入模块（推荐）

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { createObject } = require('../scripts/create-object');
const { createTextField, createOptionField, createDateField } = require('../scripts/create-field');
const { createPicklist } = require('../scripts/create-picklist');
const { createLifecycleStatus } = require('../scripts/create-lifecycle-status');
const { getObjectInfo, getFieldList, getLifecycleStatus } = require('../scripts/openapi-queries');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });

  // 1. 创建对象
  const objResult = await createObject(page, {
    name: '变更控制',
    code: 'change_control__c',
    enableLifeCycle: true
  });
  console.log(objResult); // → { success: true, message: '对象创建成功' }

  // 2. 获取 objectId
  const info = await getObjectInfo(page, 'change_control__c');
  console.log('objectId:', info.objectId, 'lifecycleId:', info.lifecycleId);

  // 3. 创建选项集
  const plResult = await createPicklist(page, {
    name: '变更类型', code: 'change_type__c',
    options: [
      { name: '主要', code: 'major__c', status: 1, operations: 1, sort: 0 },
      { name: '次要', code: 'minor__c', status: 1, operations: 1, sort: 1 }
    ]
  });

  // 4. 批量创建字段
  await createTextField(page, { objectId: info.objectId, name: '编号', code: 'no__c', isRequired: true });
  await createTextField(page, { objectId: info.objectId, name: '标题', code: 'title__c', isRequired: true });
  await createDateField(page, { objectId: info.objectId, name: '发生日期', code: 'happen_date__c' });

  // 5. 创建生命周期状态
  const statuses = [
    { name: '草稿', code: 'status_draft__c' },
    { name: '待审批', code: 'status_pending__c' },
    { name: '已完成', code: 'status_done__c' },
    { name: '已关闭', code: 'status_closed__c' }
  ];
  for (const s of statuses) {
    await createLifecycleStatus(page, { lifecycleId: info.lifecycleId, ...s });
  }

  // 6. 验证结果
  const fields = await getFieldList(page, 'change_control__c');
  const statusCount = await getLifecycleStatus(page, 'change_control__c');
  console.log(`验证: ${fields.count} 个字段, ${statusCount.count} 个状态`);

  await closeBrowser(browser);
})();
```

---

## 方式二：使用编排器一键执行（最快）

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const { runFullWorkflow } = require('../scripts/orchestrate');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });

  const blueprint = {
    object: { name: '变更控制', code: 'change_control__c', enableLifeCycle: true },
    options: [{
      name: '变更类型', code: 'change_type__c',
      options: [
        { name: '主要', code: 'major__c', status: 1, operations: 1, sort: 0 },
        { name: '次要', code: 'minor__c', status: 1, operations: 1, sort: 1 }
      ]
    }],
    fields: [
      { name: '编号', code: 'no__c', dataType: 1, isRequired: true },
      { name: '标题', code: 'title__c', dataType: 1, isRequired: true },
      { name: '日期', code: 'happen_date__c', dataType: 5 }
    ],
    layouts: { formName: '变更主布局', listName: '变更列表' }
  };

  const result = await runFullWorkflow(page, blueprint);
  console.log(JSON.stringify(result, null, 2));

  await closeBrowser(browser);
})();
```

也可以直接运行编排器内置演示（不需要写代码）：
```bash
node .trae/skills/akso-basic-config-api/scripts/orchestrate.js
```

---

## 方式三：统一入口导入（兼容旧模式，备选）

```javascript
const { launchBrowser, login, closeBrowser } = require('../../../shared/browser-manager');
const api = require('../scripts');

(async () => {
  const { browser, page } = await launchBrowser();
  await login(page, { baseUrl: 'https://xxx.aksoegmp.com', username: 'user', password: 'pass' });

  await api.createObject(page, { name: '变更控制', code: 'change_control__c' });
  await api.createTextField(page, { objectId: '...', name: '编号', code: 'no__c' });

  await closeBrowser(browser);
})();
```
