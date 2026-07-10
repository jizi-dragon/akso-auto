# 修复关联对象列显示中文名称

> 目标：Excel「关联对象/选项集」列中，对象类型字段显示中文名称而非 Code。

---

## 一、探索发现

通过调试 FieldPage API 返回值，发现每个对象类型字段的原始数据中包含 `objectRelation` 嵌套对象：

```
field.objectRelation = {
  id, name, code,
  objectId, objectName, objectCode,
  type, referenceObjectId, referenceObjectCode, ...
}
```

| 属性 | 含义 | 示例 |
|------|------|------|
| `referenceObjectCode` | 关联对象的 Code（当前使用） | `plat_org_company__ak` |
| `objectRelation.objectName` | **关联对象的中文名称** ✅ | `质量组织` |

## 二、修改方案

### 文件

`scripts/analyze-form-fields.js`

### 修改位置

`extractRelatedInfo` 函数（约第 284 行），将对象类型字段的关联名称从 `referenceObjectCode` 改为 `objectRelation.objectName`。

**修改前**（第 284-285 行）：

```javascript
} else if ([15, 16, 23].includes(field.dataType)) {
  relatedName = field.referenceObjectCode || '';
}
```

**修改后**：

```javascript
} else if ([15, 16, 23].includes(field.dataType)) {
  const rel = field.objectRelation;
  relatedName = (rel && typeof rel === 'object') ? (rel.objectName || '') : (field.referenceObjectCode || '');
}
```

### 降级逻辑

1. 优先取 `objectRelation.objectName`（中文名）
2. 若 `objectRelation` 不存在或为 null，降级为 `referenceObjectCode`
3. 若两者都无，留空

## 三、验证步骤

1. 运行 `$env:LAYOUT_NAME='默认布局'; node scripts/analyze-form-fields.js "CAPA"`
2. 检查输出 Excel 中「关联对象/选项集」列
3. 预期结果：
   - `plat_org_company__ak` → `质量组织`
   - `capa_setting__c` → `CAPA设置`
   - `deviation__c` → `偏差`
4. 选项字段（如 CAPA来源）不受影响，继续显示中文名称
