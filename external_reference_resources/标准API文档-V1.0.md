# 标准API文档-V1.0

## 1.概述

API（Application Programming Interface）文档是一份详细而规范的技术指南，它为开发者提供了与特定系统或服务进行交互的方法和规则。这份文档的核心目的是确保所有外部开发人员能够清晰、准确地理解并使用我们提供的标准化接口，以便在他们的应用程序中实现无缝集成。

*   **调用示例**：提供实际的API调用示例代码片段，帮助开发者快速上手和测试API的功能。
    
*   **错误处理**：阐述了在调用过程中可能出现的各种错误场景及相应的错误码和处理建议。
    
*   **版本控制**：记录了API的版本变更历史，使得开发者可以根据需求选择适合的API版本，并跟踪了解新特性和优化点。
    

*   **接口描述：**API文档详尽列举了所有对外公开的接口资源，包括接口名称、功能描述以及其在整个业务流程中的作用。
    
*   **认证与授权**：如果接口需要安全访问，则会介绍相关的认证机制（例如OAuth、JWT Token等）及其在请求头中的应用方式。
    
*   **响应格式**：详述了接口返回的数据结构（出参），包括状态码、响应体的数据模型、可能的错误信息以及其他关键字段的含义和用途。
    
*   **请求方法与URL结构**：定义了每个接口的HTTP请求方法（如GET、POST、PUT、DELETE等），以及对应的URL路径，便于开发者定位和调用正确的接口。
    
*   **参数说明**：明确列出接口所需的输入参数（入参），包括参数名称、数据类型、是否必填、允许的值域范围及参数含义，并提供示例展示如何正确构造请求。
    

## 2.版本变更记录

| **变更人** | **更新日期** | **变更内容** | **备注** |
| --- | --- | --- | --- |
| $\color{#0089FF}{@李廷礼}$ | 2024-02-29 | 初始发布 | N/A |
| $\color{#0089FF}{@李廷礼}$ | 2025-06-24 | 增加铃铛消息订阅接口 | N/A |

## 3.全局参数说明

### 3.1 请求头

| **参数编码** | **参数类型** | **是否必填** | **参数名称** | **参数说明** |
| --- | --- | --- | --- | --- |
| Authorization | String | 是 | 授权内容 | 请参阅《登录授权》目录 |

### 3.2 路由参数

| **参数编码** | **参数类型** | **参数名称** | **参数说明** |
| --- | --- | --- | --- |
| version | String | 接口版本号 | 接口示例：/api/openapi/v{version}/Auth<br>传参方式：/api/openapi/v1.0/Auth |

### 3.3 返回参数

| **参数编码** | **参数类型** | **参数名称** | **参数说明** |
| --- | --- | --- | --- |
| message | String | 错误信息 | 错误描述信息 |
| requestID | String | 请求Id | 当此请求Id |
| code | Int32 | 业务处理结果 | 请参阅《3.5.错误码清单》 |
| data | Object | 返回的业务数据 | 如果有的情况下，才会有data返回 |

### 3.4 错误码清单

| **错误编码** | **错误描述** | **备注** |
| --- | --- | --- |
| 0 | 成功 | 表示成功 |
| 401 | 无权限 | 需要重新登录 |
| 403 | 未访问到 | N/A |
| 500 | 统一错误 | 非当前标记的错误码，都会统一给500 |
| 518 | 配置迁移 | 做配置迁移的时候会触发 |
| 1000 | 参数验证错误 | N/A |
| 10000 | 授权码无效 | 无效的授权code |

## 4.标准接口设计说明

### 4.1 获取访问令牌

#### 4.1.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Auth | N/A |

#### 4.1.2 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| account | 是 | String | 登录账号 |
| password | 是 | String | 密码 |

```json
{
  "account": "admin",
  "password": "888888"
}
```

#### 4.1.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | String | 访问令牌（有效期60分钟） |

##### 4.1.3.1 正常返回示例

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjU4MDAyMjg1LTI5MjMtNGRlYi1iMGMwLTJhMjVmOTY3MGU4YSIsInRlbmFudGlkIjoiM2EwODA3YTUtMmQ5ZS05NWU2LThjYzUtMjRhNjA3NjY0ZGIzIiwiY2xpZW50X2lkIjoiT3BlbkFwaSIsIkF1dGhDb2RlIjoiQXV0aENvZGU6QXV0aENvZGVfN2I4YTVkOTMtYTc3Yy00ZDk0LTk3YzYtMWIzMDJiZDQxZTNiIiwiaXNFbmFibGVTaW5nbGVEZXZpY2VMb2dpbiI6IkZhbHNlIiwiQ2FjaGVLZXkiOiJiZjA1MDExYy05M2JjLTRmOTYtYTliNi1mY2RiMzQ3ZTYxZDciLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiYWRtaW4iLCJMb2dpbkF1dGhUeXBlIjoiMCIsImV4cCI6MTcwOTI2NTU0OSwiaXNzIjoiQWtzb0F1dGhDZW50ZXIiLCJhdWQiOiJhZG1pbiJ9.rAIBd2_3nqvyk7hX35OVHwrmlOWQkxzrfYWMHd2mi5M",
    "requestID": "0HN1PI3O02AS0:00000002"
}
```

##### 4.1.3.2 错误返回示例

```json
{
    "code": 401,
    "errorCode": 0,
    "message": "登录信息过期",
    "data": null,
    "requestID": null
}
```

### 4.2 获取SSO授权链接

#### 4.2.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/OAuth/SSOUrl | N/A |

#### 4.2.2 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | String | SSO登录授权链接 |

```json
{
    "code": 500,
    "errorCode": 0,
    "message": " 不支持的SSO类型!",
    "data": null,
    "requestID": "0HN1PI3O02C8M:00000002"
}
```

### 4.3 获取转档信息

#### 4.3.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/Document/file/{doc\_record\_id} | N/A |

#### 4.3.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| doc\_record\_id | 是 | Guid | 文件记录Id |

#### 4.3.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | String | 文件路径 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": "4ed9d8c0-7b3b-413a-aa7a-c22d05bafd5c.pdf",
    "requestID": "0HN1PI3O02D4P:00000002"
}
```

### 4.4 添加文件审计日志

#### 4.4.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Document/log/{record\_id} | N/A |

#### 4.4.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| record\_id | 是 | Guid | 文件Id |

#### 4.4.3 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| remark | 否 | String | 备注 |
| operationType | 是 | String | 操作类型 |

```json
{
  "remark": "测试",
  "operationType": "test"
}
```

#### 4.4.4 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "requestID": "0HN1PI3O02DFR:00000002"
}
```

### 4.5 获取对象状态列表

#### 4.5.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/BasicObject/lifecycleStatus/{objectCode} | N/A |

#### 4.5.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| objectCode | 是 | String | 对象编码 |

#### 4.5.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Array | 对象状态列表 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": [
        {
            "id": "3a30a9da-83fd-c329-055f-3a0ded4e5a72",//生命周期状态id
            "code": "init_status__c",//生命周期状态编码
            "name": "开启",//生命周期状态名称
            "lifecycleId": "3a0ded4e-5895-d342-eb60-c66f287f4d4a",//生命周期Id
            "lifecycleName": "铅印重打生命周期"//生命周期状态名称
        }
    ],
    "requestID": "0HN1PI3O02E07:00000002"
}
```

### 4.6 获取对象的字段列表

#### 4.6.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/BasicObject/field/{objectCode}/{fieldCode} | N/A |

#### 4.6.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| objectCode | 是 | String | 对象编码 |
| fieldCode | 否 | String | 字段编码(不传查询所有字段) |

#### 4.6.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Array | 对象字段列表 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": [
        {
            "objectId": "3a0ded4e-5895-70c7-835f-8da31b2b0335",//对象Id
            "name": "打印水印",//字段名称
            "code": "code__c",//字段编码
            "status": 1,//字段状态（1：启用;2：禁用）
            "dataType": 3,// 数据类型(1:文本;2：数字;3：布尔;4：选项;5：日期;6：时间;7：日期时间;8：附件;9：图片:10：Id;11：链接;12：邮箱;13：查找;14：公式;15：对象;16：父对象;17：长文本;18：富文本)
            "source": 3,//来源(1：系统内置;2：标准;3：自定义)
            "iconType": null,//字段图标的类型（固定：1，公式字段：2，公式：3）
            "iconValue": null,//字段图标的值
            "icon": null,//字段图标（公式的话需要计算）
            "maxLength": null,//【通用】最大长度
            "minValue": "",//【通用】 最小值
            "maxValue": "",//【通用】最大值
            "scale": null,//【数字类型】小数位数
            "format": null,// 【日期类型】字段类型格式化例如：yyyy-MM-dd
            "minOffsetValue": null,// 【日期】最小值偏移量
            "minOffsetUnit": null,// 【日期】最小值偏移单位
            "minLogicValue": null,// 【日期】最小值
            "maxOffsetValue": null,// 【日期】最大值偏移量
            "maxOffsetUnit": null,// 【日期】最大值偏移单位
            "maxLogicValue": null,// 【日期】最大值
            "isMultipleChoice": true,//【选项列表】是否多选
            "picklistId": null,//【选项列表】Id,  只适用于选项字段类型
            "picklist": null,// 选项实例
            "isRequired": true,// 【通用】是否必填
            "isUnique": false,// 【通用】是否唯一
            "isIndexed": true,// 【通用】是否索引
            "isTranslate": false,// 【通用】是否翻译
            "isDisplayDefaultLists": false,//【通用】是否显示在默认列表
            "isNotCopyFieldRecord": false,//【通用】是否复制记录时不复制该字段
            "isDepthCopy": null,// 深复制开启：在父对象类型字段的编辑页面中
            "componentType": null,// 【通用】组件类型
            "systemManageFieldValue": false,// 由系统管理字段值
            "codeRuleId": null,// 编号规则Id
            "relationId": null,// 关系id
            "objectRelation": null,// 关系
            "isCreateReferenceRecord": false,// 是否允许创建新的引用记录
            "referenceObjectId": null,// 引用对象Id
            "referenceObjectCode": null,// 引用对象Code
            "documentVersion": null,// 文档版本选择方式(1: 当前版本;2：最新稳定版本;3：最新版本)
            "enableTree": false,// 是否启用树形结构
            "onlySelectLeafNode": false,// 树形子选择叶子节点
            "treePathCode": null,// 树形字段编码
            "referenceObjectEnalbeTree": false,// 查找关系Id
            "findRelationshipId": null,// 查找源字段
            "findSourceFieldId": null,// 查找源字段
            "sourceFieldConfig": null,// 源字段配置信息
            "statisticsMode": null,// 统计方式(1:计数;2:求和;3:平均;4:最大;5:最小)
            "statisticsRelationId": null,// 统计的入站关系
            "statisticsFieldId": null,// 统计的字段
            "statisticsAccuracy": null,// 统计结果处理（1：四舍五入;2:向上取整;3:向下取整）
            "returnType": null,// 返回类型
            "formulaScript": null,// 公式脚本
            "formulaDepFields": null,// 公式脚本依赖字段
            "defaultValDepFields": "",// 默认值脚本依赖字段
            "attachmentCount": null,// 【附件】允许上传的最大附件数量
            "attachmentSize": null,// 【附件】允许上传的最大文件大小（MB）
            "attachmentExtension": null,// 【附件】允许上传的附件扩展名（用竖线|分隔）
            "helpContent": "",// 帮助内容
            "setDefaultValue": "true",// 设置默认值
            "columnName": "code__c",// 列名
            "deleteColumnName": "",// 删除后修改的别名(删除字段时，不会立即删除列名，而是进行修改列名，保留一段时间)
            "isRemove": false,//【通用】是否移除
            "sort": 23,// 排序编号
            "generateGroupSort": null,// 排序-生成映射组
            "referenceConstraintsCondition": null,// 引用约束条件
            "documentTypeIds": null,// 可选的文档类型Id
            "editable": true,// 实例数据是否可通过表单提交修改
            "createdBy": "516fe5eb-1072-4c87-8658-4df14638150a",//创建人
            "createdTime": "2023-10-17 20:28:58",//创建时间
            "modifiedBy": "00000000-0000-0000-0000-000000000000",//更新人
            "modifiedTime": "0001-01-01 00:00:00",//更新时间
            "isDeleted": false,//是否删除
            "id": "3a0e5301-2c4a-603a-e11f-40ba156d3b81"//字段Id
        }
    ],
    "requestID": "0HN1PI3O02EGQ:00000002"
}
```

### 4.7 获取选项列表

#### 4.7.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/BasicObject/picklist/{code} | N/A |

#### 4.7.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| code | 是 | String | 选项编码 |

#### 4.7.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Array | 选项列表 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": [
        {
            "id": "6b680911-f3e2-449e-b369-049fcc8b3012",//选项Id
            "objectPicklistId": "2e0981c5-bccf-c779-b7c0-3a0f69b1805d",//选项集Id
            "name": "永久",//选项名称
            "code": "1__c",//选项编码
            "sort": 0,//排序
            "status": 1//状态(1:启用;2:禁用;)
        }
    ],
    "requestID": "0HN1PI3O02GOO:00000002"
}
```

### 4.8 获取对象信息

#### 4.8.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/BasicObject/{code} | N/A |

#### 4.8.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| code | 是 | String | 对象编码 |

#### 4.8.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Object | 对象信息 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "name": "用户-文件",//名称
        "code": "tms_user_document__ak",//编码
        "recordIdCode": "1233",//记录Id编码
        "status": 1,//状态(1:启用;2:禁用)
        "source": 2,//来源(1：系统内置;2：标准;3：自定义)
        "objectClass": 1,//对象类别(1:基础;2:电子签名;4:用户任务;5:用户角色设置;10:审批矩阵管理;11:审批矩阵角色)
        "isBigVolume": false,// 是否大容量
        "description": "",// 描述
        "isManageMenuDisplay": false,// 是否在业务管理菜单中显示
        "enableSignatures": false,// 启用电子签名
        "enableDataAudit": false,// 是否启用数据审计
        "isAssociatedMultipleRecords": false,// 关联多条记录（父对象两个以上可以关联）
        "isSimpleRelation": false,// 是否是简单关联关系对象(有两个必填父对象字段，无其它必填)
        "isNotRepeatChoice": false,// 多对多是否不可重复选择（true不可重复选）
        "lifeCycleId": null,// 生命周期Id
        "lifeCycleName": null,// 生命周期名称
        "enableLifeCycle": false,// 是否启用生命周期
        "enableObjectTypes": false,// 是否启用对象类型
        "enableDacControl": false,// 是否开启动态访问控制
        "userRoleSettingObjectId": null,// 用户角色设置对象Id
        "useSafetyActionControlDataAudit": false,// 使用动作安全来控制数据审计
        "useSafetyActionControlSharedSet": false,// 使用动作安全来控制共享设置
        "parentObject": null,// 父对象
        "helpContent": "",// 帮助内容
        "sort": 241,// 排序
        "isRemove": false,// 是否移除
        "createdName": null,// 创建人名称
        "modifiedName": null,// 修改人名称
        "isEditDictionary": null,// 是否编辑数据字典
        "tableName": "record_tms_user_document__ak",// 表名称
        "model": null,// 模型
        "uniqueKey": null,// 唯一键
        "enableTree": false,// 是否启用
        "treeFieldCode": null,// 树形字段编码
        "treePathCode": null,// 树形路径字段编码
        "treeChildCountCode": null,// 树形子级数量编码
        "companyFieldCode": null,// 质量组织字段Code
        "dataDimension": null,// 数据维度
        "linkageFields": null,// 联动字段/主要用于判断列表不能编辑
        "dacTableName": null,// 动态授权表名称
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "2023-09-13 03:35:41",//创建时间
        "modifiedBy": "00000000-0000-0000-0000-000000000000",//更新人
        "modifiedTime": "2023-09-13 03:35:41",//更新时间
        "isDeleted": false,//是否删除
        "id": "5dfc3c2c-24df-20ab-126f-9d67c671f15f"//对象Id
    },
    "requestID": "0HN1PI3O02GSL:00000002"
}
```

### 4.9 获取对象类型信息

#### 4.9.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/BasicObject/objectType/{objectId}/{objectTypeCode} | N/A |

#### 4.9.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| objectId | 是 | Guid | 对象类型 |
| objectTypeCode | 是 | String | 对象类型编码 |

#### 4.9.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Object | 对象类型信息 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "objectId": "3a09ccdd-2d7a-dfac-4a59-07a50cb8a2a5",//对象ID
        "name": "基础类型",//对象类型名称
        "code": "base__ak",//对象类型编码
        "status": 1,//状态(1:启用;2:禁用)
        "sort": 1,//排序
        "isBase": true,//是否是基础类型
        "createdBy": "58002285-2923-4deb-b0c0-2a25f9670e8a",//创建人
        "createdTime": "2023-06-18 20:37:17",//创建时间
        "modifiedBy": "58002285-2923-4deb-b0c0-2a25f9670e8a",//修改人
        "modifiedTime": "2023-06-18 20:37:17",//修改时间
        "isDeleted": false,//是否删除
        "id": "f1ef160a-c0ca-11c8-95c9-3a0be3e749ec"//对象类型Id
    },
    "requestID": "0HN1PI3O02HA6:00000002"
}
```

### 4.10 获取对象实例详情

#### 4.10.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Object/{object\_code}/{record\_id} | N/A |

#### 4.10.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| object\_code | 是 | String | 对象编码 |
| record\_id | 是 | String | 对象实例Id |

#### 4.10.3 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| fields | 是 | Array | 需要过滤的字段(这里body是一个数组类型，可以不指定参数名fields，直接传Json数组即可) |

#### 4.10.4 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Object | 对象实例详情 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "companyId": "00000000-0000-0000-0000-000000000000",// 公司ID
        "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",// 对象ID
        "objectCode": "dms_document__ak",// 对象Code
        "objectTypeId": "00000000-0000-0000-0000-000000000000",// 对象类型ID
        "fieldRecords": [
            {
                "fieldId": "5c134dd5-029a-87c4-7100-3a0be3e7a7e8",//字段Id
                "fieldCode": "global_id__sys",//字段编码
                "value": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//字段值
            }
        ],
        "dataSourceType": 0,//实例数据来源(1:普通;2:导入;3:导入;)
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "0001-01-01 00:00:00",//创建时间
        "modifiedBy": "00000000-0000-0000-0000-000000000000",//修改人
        "modifiedTime": "0001-01-01 00:00:00",//修改时间
        "isDeleted": false,//是否删除
        "id": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//对象实例Id
    },
    "requestID": "0HN1PI3O02HO9:00000002"
}
```

### 4.11 获取对象实例详情(显示值)

#### 4.11.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Object/display/{object\_code}/{record\_id} | N/A |

#### 4.11.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| object\_code | 是 | String | 对象编码 |
| record\_id | 是 | String | 对象实例Id |

#### 4.11.3 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| fields | 是 | Array | 需要过滤的字段(这里body是一个数组类型，可以不指定参数名fields，直接传Json数组即可) |

#### 4.11.4 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Object | 对象实例详情 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "companyId": "00000000-0000-0000-0000-000000000000",// 公司ID
        "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",// 对象ID
        "objectCode": "dms_document__ak",// 对象Code
        "objectTypeId": "00000000-0000-0000-0000-000000000000",// 对象类型ID
        "fieldRecords": [
            {
                "fieldId": "5c134dd5-029a-87c4-7100-3a0be3e7a7e8",//字段Id
                "fieldCode": "global_id__sys",//字段编码
                "value": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//字段值
            }
        ],
        "dataSourceType": 0,//实例数据来源(1:普通;2:导入;3:导入;)
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "0001-01-01 00:00:00",//创建时间
        "modifiedBy": "00000000-0000-0000-0000-000000000000",//修改人
        "modifiedTime": "0001-01-01 00:00:00",//修改时间
        "isDeleted": false,//是否删除
        "id": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//对象实例Id
    },
    "requestID": "0HN1PI3O02HO9:00000002"
}
```

### 4.12 新增对象实例

#### 4.12.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Object/create/{object\_code} | N/A |

#### 4.12.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| object\_code | 是 | String | 对象编码 |

#### 4.12.3 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| fields | 是 | Dictionary<string, string> | 需要过滤的字段(这里body是一个数组类型，可以不指定参数名fields，直接传Json对象即可) |

```json
{
    "file_name__ak":"测试_00001.doc",
    "file_path__ak":"4ed9d8c0-7b3b-413a-aa7a-c22d05bafd5c.pdf",
    "state__ak":"99999999-0000-0000-0001-000000000002",
    "status_id__sys":"c854fb21-8679-26ca-81cc-3a0be3eff309",
    "lifecycle_id__ak":"f50ca664-f2c8-11ed-8118-02420a000117"
}
```

#### 4.12.4 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Object | 对象实例详情 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "companyId": "00000000-0000-0000-0000-000000000000",// 公司ID
        "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",// 对象ID
        "objectCode": "dms_document__ak",// 对象Code
        "objectTypeId": "00000000-0000-0000-0000-000000000000",// 对象类型ID
        "fieldRecords": [
            {
                "fieldId": "5c134dd5-029a-87c4-7100-3a0be3e7a7e8",//字段Id
                "fieldCode": "global_id__sys",//字段编码
                "value": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//字段值
            }
        ],
        "dataSourceType": 0,//实例数据来源(1:普通;2:导入;3:导入;)
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "0001-01-01 00:00:00",//创建时间
        "modifiedBy": "00000000-0000-0000-0000-000000000000",//修改人
        "modifiedTime": "0001-01-01 00:00:00",//修改时间
        "isDeleted": false,//是否删除
        "id": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//对象实例Id
    },
    "requestID": "0HN1PI3O02HO9:00000002"
}
```

### 4.13 修改对象实例

#### 4.13.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| PUT | /api/openapi/v{version}/Object/{object\_code}/{record\_id} | N/A |

#### 4.13.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| object\_code | 是 | String | 对象编码 |
| record\_id | 是 | Guid | 示例Id |

#### 4.13.3 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| fields | 是 | Dictionary<string, string> | 需要过滤的字段(这里body是一个数组类型，可以不指定参数名fields，直接传Json对象即可) |

```json
{
    "file_name__ak":"测试_00001.doc",
    "file_path__ak":"4ed9d8c0-7b3b-413a-aa7a-c22d05bafd5c.pdf",
    "state__ak":"99999999-0000-0000-0001-000000000002",
    "status_id__sys":"c854fb21-8679-26ca-81cc-3a0be3eff309",
    "lifecycle_id__ak":"f50ca664-f2c8-11ed-8118-02420a000117"
}
```

#### 4.13.4 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Object | 对象实例详情 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "companyId": "00000000-0000-0000-0000-000000000000",// 公司ID
        "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",// 对象ID
        "objectCode": "dms_document__ak",// 对象Code
        "objectTypeId": "00000000-0000-0000-0000-000000000000",// 对象类型ID
        "fieldRecords": [
            {
                "fieldId": "5c134dd5-029a-87c4-7100-3a0be3e7a7e8",//字段Id
                "fieldCode": "global_id__sys",//字段编码
                "value": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//字段值
            }
        ],
        "dataSourceType": 0,//实例数据来源(1:普通;2:导入;3:导入;)
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "0001-01-01 00:00:00",//创建时间
        "modifiedBy": "00000000-0000-0000-0000-000000000000",//修改人
        "modifiedTime": "0001-01-01 00:00:00",//修改时间
        "isDeleted": false,//是否删除
        "id": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//对象实例Id
    },
    "requestID": "0HN1PI3O02HO9:00000002"
}
```

### 4.14 根据条件获取对象实例列表

#### 4.14.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Object/{object\_code} | N/A |

#### 4.14.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| object\_code | 是 | String | 对象编码 |

#### 4.14.3 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| conds | 是 | List<ObjectWhereFilterDto> | 需要过滤的字段(这里body是一个数组类型，可以不指定参数名conds，直接传Json数组即可) |

```json
[
  {
    "fieldCode": "global_id__sys",
    "logicValue": "65b32cc9-1067-4d60-b790-c3a11bc3c10e",
    "logicType": 1//逻辑类型(1:等于;2:不等于;3:开始于;4:大于;5:小于;6:大于等于;7:小于等于;8:包含;9:不包含;10:为空;11:非空;12:存在;13:不存在;14:介于;15:结束于;16:在过去;17:在未来;18:不在过去;19:包含于;20:不包含于;21:值变更;53:存在记录;54:不存在记录;60:任一记录满足以下条件;61:没有记录满足以下条件;99:全文检索)    
  }
]
```

#### 4.14.4 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Array | 对象实例详情列表 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": [
      {
        "companyId": "00000000-0000-0000-0000-000000000000",// 公司ID
        "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",// 对象ID
        "objectCode": "dms_document__ak",// 对象Code
        "objectTypeId": "00000000-0000-0000-0000-000000000000",// 对象类型ID
        "fieldRecords": [
            {
                "fieldId": "5c134dd5-029a-87c4-7100-3a0be3e7a7e8",//字段Id
                "fieldCode": "global_id__sys",//字段编码
                "value": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//字段值
            }
        ],
        "dataSourceType": 0,//实例数据来源(1:普通;2:导入;3:导入;)
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "0001-01-01 00:00:00",//创建时间
        "modifiedBy": "00000000-0000-0000-0000-000000000000",//修改人
        "modifiedTime": "0001-01-01 00:00:00",//修改时间
        "isDeleted": false,//是否删除
        "id": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//对象实例Id
    }
    ],
    "requestID": "0HN1PI3O02HO9:00000002"
}
```

### 4.15 根据条件获取指定字段的对象实例列表

#### 4.15.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Object/list/{object\_code} | N/A |

#### 4.15.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| object\_code | 是 | String | 对象编码 |

#### 4.15.3 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| conditions | 是 | List<ObjectWhereFilterDto> | 条件列表 |
| selectFields | 否 | List<String> | 需要返回的字段列表 |

```json
{
  "conditions": [
    {
	  "fieldCode": "global_id__sys",
	  "logicValue": "65b32cc9-1067-4d60-b790-c3a11bc3c10e",
	  "logicType": 1//逻辑类型(1:等于;2:不等于;3:开始于;4:大于;5:小于;6:大于等于;7:小于等于;8:包含;9:不包含;10:为空;11:非空;12:存在;13:不存在;14:介于;15:结束于;16:在过去;17:在未来;18:不在过去;19:包含于;20:不包含于;21:值变更;53:存在记录;54:不存在记录;60:任一记录满足以下条件;61:没有记录满足以下条件;99:全文检索) 
	}
  ],
  "selectFields": [
    "name__ak"
  ]
}
```

#### 4.15.4 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Array | 对象实例详情列表 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": [
      {
        "companyId": "00000000-0000-0000-0000-000000000000",// 公司ID
        "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",// 对象ID
        "objectCode": "dms_document__ak",// 对象Code
        "objectTypeId": "00000000-0000-0000-0000-000000000000",// 对象类型ID
        "fieldRecords": [
            {
                "fieldId": "5c134dd5-029a-87c4-7100-3a0be3e7a7e8",//字段Id
                "fieldCode": "global_id__sys",//字段编码
                "value": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//字段值
            }
        ],
        "dataSourceType": 0,//实例数据来源(1:普通;2:导入;3:导入;)
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "0001-01-01 00:00:00",//创建时间
        "modifiedBy": "00000000-0000-0000-0000-000000000000",//修改人
        "modifiedTime": "0001-01-01 00:00:00",//修改时间
        "isDeleted": false,//是否删除
        "id": "b51b2cc9-1067-46b7-8e09-da2804b97f28"//对象实例Id
    }
    ],
    "requestID": "0HN1PI3O02HO9:00000002"
}
```

### 4.16 获取附件列表

#### 4.16.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/Object/attachments/{instanceId}/{objectFieldId} | N/A |

#### 4.16.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| instanceId | 是 | Guid | 实例Id |
| objectFieldId | 是 | Guid | 对象字段Id |

#### 4.16.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Array | 对象实例详情列表 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": [
        {
            "instanceId": "2d51ce2c-1067-4c06-a025-5bbc0588c862",// 对象实例Id
            "objectFieldId": "c0fcaa03-7741-4df6-83fa-a60341762eab",// 对象实例字段Id
            "fileId": "00000000-0000-0000-0000-000000000000",// 文件Id
            "filePath": "0e97bfba-b75e-4f69-976c-921b2b8109f7.doc",// 文件路径
            "fileName": "V3.0.6.10测试报告.doc",// 文件名称
            "fileExtName": "doc",// 扩展名
            "fileSize": 117797,// 文件大小
            "md5": null,// md5
            "sort": 1,// 排序
            "remark": null,// 备注
            "pageCount": null,// 页数
            "createdBy": "483914a1-1072-42b9-9e15-6502b0f23276",//创建人
            "createdTime": "2024-02-29 20:02:25",//创建时间
            "modifiedBy": "483914a1-1072-42b9-9e15-6502b0f23276",//修改人
            "modifiedTime": "2024-02-29 20:02:25",//修改时间
            "isDeleted": false,//是否删除
            "id": "854f4493-66d4-6f69-cf9b-3a110a235e16"//Id
        }
    ],
    "requestID": "0HN1PNFMV6KH0:00000002"
}
```

### 4.17 新增附件

#### 4.17.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Object/attachments | N/A |

#### 4.17.2 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| N/A | 是 | List<ObjectAttachmentRecordDto> | 附件列表 |

```json
[
  {
    "instanceId": "2d51ce2c-1067-4c06-a025-5bbc0588c862",// 对象实例Id
    "objectFieldId": "c0fcaa03-7741-4df6-83fa-a60341762eab",// 对象实例字段Id
    "fileId": "00000000-0000-0000-0000-000000000000",// 文件Id
    "filePath": "0e97bfba-b75e-4f69-976c-921b2b8109f7.doc",// 文件路径
    "fileName": "V3.0.6.10测试报告.doc",// 文件名称
    "fileExtName": "doc",// 扩展名
    "fileSize": 117797,// 文件大小
    "md5": "",// md5
    "sort": 1,// 排序
    "remark": "",// 备注
    "pageCount": 0,// 页数
    "createdBy": "3fa85f64-5717-4562-b3fc-2c963f66afa6",//创建人
    "createdTime": "2024-03-01T07:59:52.336Z",//创建时间
    "modifiedBy": "3fa85f64-5717-4562-b3fc-2c963f66afa6",//修改人
    "modifiedTime": "2024-03-01T07:59:52.336Z",//修改时间
    "isDeleted": false,//是否删除
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"//Id
  }
]
```

#### 4.17.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Bool | 是否成功 true表示成功 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": true,
    "requestID": "0HN1PNFMV6KRE:00000002"
}
```

### 4.18 删除附件

#### 4.18.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| DELETE | /api/openapi/v{version}/Object/attachments/{instanceId}/{objectFieldId} | N/A |

#### 4.18.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| instanceId | 是 | Guid | 实例Id |
| objectFieldId | 是 | Guid | 对象实例字段Id |

#### 4.18.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Bool | 是否成功 true表示成功 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": true,
    "requestID": "0HN1PNFMV6KRE:00000002"
}
```

### 4.19 修改对象实例状态

#### 4.19.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Object/status/{instanceId}/{statusCode} | N/A |

#### 4.19.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| instanceId | 是 | Guid | 实例Id |
| statusCode | 是 | String | 状态编码 |

#### 4.19.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Bool | 是否成功 true表示成功 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": true,
    "requestID": "0HN1PP0CGN14E:00000002"
}
```

### 4.20 获取对象实例的索引信息

#### 4.20.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/Object/recordIndex/{instanceId} | N/A |

#### 4.20.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| instanceId | 是 | Guid | 实例Id |

#### 4.20.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Object | 对象实例的索引信息 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",// 对象ID
        "objectCode": "dms_document__ak",// 对象编号
        "objectTypeId": "a963dead-d694-164b-b7a2-3a0be3e79a08",// 对象类型ID
        "name": "V3.0.6.10测试报告",//名称
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "0001-01-01 00:00:00",//创建时间
        "isDeleted": false,//是否删除
        "parentPath": null,//// 父级路径
        "id": "6f7979f7-1067-4e8e-99e3-677c0192fbda"//Id
    },
    "requestID": "0HN1PP0CGNHPG:00000002"
}
```

### 4.21 获取字段值

#### 4.21.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| POST | /api/openapi/v{version}/Object/recordFieldValue | N/A |

#### 4.21.2 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| fieldList | 是 | Array | 字段列表 |
| record | 是 | Object | 实例记录 |

```json
{
  "fieldList": [
    "name__ak"
  ],
  "record": {
    "companyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",// 公司ID
    "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",// 对象ID
    "objectCode": "dms_document__ak",// 对象Code
    "objectTypeId": "a963dead-d694-164b-b7a2-3a0be3e79a08",// 对象类型ID
    "fieldRecords": [
      {
        "fieldId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",// 字段ID
        "fieldCode": "name__ak",// 字段编号
        "value": "V3.0.6.10测试报告"/// 字段值
      }
    ],
    "dataSourceType": 0,
    "createdBy": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "createdTime": "2024-03-02T00:49:04.266Z",
    "modifiedBy": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "modifiedTime": "2024-03-02T00:49:04.266Z",
    "isDeleted": true,
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
}
```

#### 4.21.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Bool | 是否成功 true表示成功 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "name__ak": "V3.0.6.10测试报告"
    },
    "requestID": "0HN1PP0CGNI1E:00000002"
}
```

### 4.22 获取对象实例的值

#### 4.22.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/Object/record/{instanceId} | N/A |

#### 4.22.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| instanceId | 是 | Guid | 示例Id |

#### 4.22.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Bool | 是否成功 true表示成功 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": {
        "companyId": "00000000-0000-0000-0000-000000000000",//公司ID
        "objectId": "0663cc50-c581-4f3d-b729-ba8252c1ee1f",//对象ID
        "objectCode": "dms_document__ak",// 对象Code
        "objectTypeId": "a963dead-d694-164b-b7a2-3a0be3e79a08",// 对象类型ID
        "fieldRecords": [
            {
                "fieldId": "3a10faa5-125e-a364-3541-e62d65170161",// 字段ID
                "fieldCode": "fddd__c",// 字段编号
                "value": 0.0// 字段值
            },
            {
                "fieldId": "4801f415-e7ce-0daf-ae45-2000990f3407",// 对象类型ID
                "fieldCode": "is_preview_watermark__ak",// 字段编号
                "value": true// 字段值
            },
            {
                "fieldId": "03e5f2f6-2dea-e6b2-a3fc-368a0637ab9f",// 对象类型ID
                "fieldCode": "full_text_search__ak",// 字段编号
                "value": "{\"\\"title\\": null\",\"\\"summary\\": null\",\"\\"content\\": null\"}"// 字段值
            }
        ],
        "dataSourceType": 0,//实例数据来源类型(0:普通;1:导入;2:迁移;)
        "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
        "createdTime": "0001-01-01 00:00:00",//创建时间
        "modifiedBy": "00000000-0000-0000-0000-000000000000",//修改人
        "modifiedTime": "0001-01-01 00:00:00",//修改时间
        "isDeleted": false,//是否删除
        "id": "6f7979f7-1067-4e8e-99e3-677c0192fbda"//Id
    },
    "requestID": "0HN1RTGCP9VNH:00000002"
}
```

### 4.23 获取对象状态

#### 4.23.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /api/openapi/v{version}/Object/status/{object\_code} | N/A |

#### 4.23.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| object\_code | 是 | String | 对象编号 |

#### 4.23.3 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Bool | 是否成功 true表示成功 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": [
        {
            "name": "开启",//名称
            "code": "init_status__c",//编码
            "lifecycleId": "195645d9-7034-65e6-f0c5-3a0be3e799e2",//生命周期id
            "sort": 1,//顺序
            "isEnabled": true,//是否启用
            "description": "文件生命周期状态：开启",//描述
            "workflowCancelStatus": null,//工作流取消状态
            "isRecordDeactivate": false,//记录是否停用
            "dmsStatusMapping": null,//文档状态映射
            "source": 3,//来源(1:系统内置;2:标准;3:自定义;)
            "createdBy": "00000000-0000-0000-0000-000000000000",//创建人
            "createdTime": "0001-01-01 03:37:38",//创建时间
            "modifiedBy": "00000000-0000-0000-0000-000000000000",//修改人
            "modifiedTime": "0001-01-01 00:00:00",//修改时间
            "isDeleted": false,//是否删除
            "id": "4944ba6d-be87-8a5a-3806-3a0be3e79cea"//主键
        }
    ],
    "requestID": "0HN1RTGCP9VQS:00000002"
}
```

### 4.24 修改对象实例状态

#### 4.24.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| PUT | /api/openapi/v{version}/Object/status/{object\_code}/{record\_id} | N/A |

#### 4.24.2 Query参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| object\_code | 是 | String | 对象编号 |
| record\_id | 是 | Guid | 实例Id |

#### 4.24.3 Body参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| statusCode | 是 | String | 状态编码 |

#### 4.24.4 返回参数

| **参数名称** | **数据类型** | **描述** |
| --- | --- | --- |
| code | Int32 | 业务处理结果 |
| errorCode | Int32 | 错误码 |
| message | String | 错误消息 |
| data | Bool | 是否成功 true表示成功 |

```json
{
    "code": 0,
    "errorCode": 0,
    "message": null,
    "data": null,
    "requestID": "0HN1RTGCPA03R:00000002"
}
```

### 4.25 加密下载接口

#### 4.25.1 接口定义

| **请求方式** | **接口路由** | **备注** |
| --- | --- | --- |
| GET | /openapi/v{version}/Document/files/encrypted\_download/{filePath} | N/A |

#### 4.25.2 路由参数

| **参数名称** | **是否必填** | **数据类型** | **描述** |
| --- | --- | --- | --- |
| filePath | 是 | string | 文件路径 |

#### 4.25.3 返回参数

| **参数名称** | **是否必填** | **数据类型** | **字段名称** | **默认值** | **备注** |
| --- | --- | --- | --- | --- | --- |
| file | 是 | File | 下载的文件流 | N/A | N/A |

## 5.事件接口设计说明

### 5.1 铃铛消息接口

#### 5.1.1 接口定义

该接口的请求方式固定为POST请求，需要用户(订阅者)提供完整的接口路径给到我们的实施人员(按照该示例进行提供：http://172.168.0.1:8080/api/weaver/push-custom-message)。

| **请求方式** | **接口路由** | **示例** | **备注** |
| --- | --- | --- | --- |
| POST | 该接口路由需要用户(订阅者)自定义 | `/api/weaver/push-custom-message` | N/A |

#### 5.1.2 Body参数

Body参数由系统统一下发的固定格式，接收方必须按照该模型进行接收。

| **参数编码** | **参数名称** | **是否必填** | **数据类型** | **示例** | **备注** |
| --- | --- | --- | --- | --- | --- |
| UserInfos | 用户列表 | 是 | 数组 | N/A | 当前这条消息所设计的用户列表 |
| UserId | 用户Id | 是 | 文本 | dee5c94b-1072-4d74-972f-b1ad03c17b8d | N/A |
| Name | 用户姓名 | 是 | 文本 | 张三 | N/A |
| Account | 用户账号 | 是 | 文本 | ys | N/A |
| UserJobNumber | 用户工号 | 否 | 文本 | ys | N/A |
| Subject | 消息标题 | 是 | 文本 | DMS/TMS系统提醒：文件生效通知 | N/A |
| Jumplink | 跳转链接 | 否 | 文本 | [http://172.16.1.75//#/instantaneous?bid=0663cc50-c581-4f3d-b729-ba8252c1ee1f&id=20fc2792-1067-4735-96f0-e68537956cf0](http://172.16.1.75//#/instantaneous?bid=0663cc50-c581-4f3d-b729-ba8252c1ee1f&id=20fc2792-1067-4735-96f0-e68537956cf0) | N/A |
| Content |  | 是 | 文本 | 您好：  <br>\nWG-RA-2025064 1 1.0<文件已生效，如有需要，请登录eGMP系统查看。链接：<a href="http://172.16.1.75//#/instantaneous?bid=0663cc50-c581-4f3d-b729-ba8252c1ee1f&id=20fc2792-1067-4735-96f0-e68537956cf0">查看详情。 | N/A |

```json
{
    "UserInfos": [
        {
            "UserId": "dee5c94b-1072-4d74-972f-b1ad03c17b8d",
            "Name": "张三",
            "UserJobNumber": "ys",
            "Account": "ys"
        },
        {
            "UserId": "c6911f44-1072-4bfb-bd1c-24fda1a38300",
            "Name": "李四",
            "UserJobNumber": null,
            "Account": "11000170"
        }
    ],
    "Subject": "DMS/TMS系统提醒：文件生效通知",
    "Jumplink": "http://172.0.0.1//#/instantaneous?bid=0663cc50-c581-4f3d-b729-ba8252c1ee1f&id=20fc2792-1067-4735-96f0-e68537956cf0",
    "Content": "您好：<br>\nWG-RA-2025064 1 1.0<文件已生效，如有需要，请登录eGMP系统查看。链接：<a href=\"http://172.0.0.1//#/instantaneous?bid=0663cc50-c581-4f3d-b729-ba8252c1ee1f&id=20fc2792-1067-4735-96f0-e68537956cf0\">查看详情</a>。<br>"
}
```

#### 5.1.3 返回参数

固定返回一个OK给到egmp系统即可，用户(订阅者)可参考如下代码示例进行定义

```json
/// <summary>
/// 发送自定义消息接口
/// </summary>
/// <param name="param">接收参数</param>
/// <returns></returns>
[HttpPost("push-custom-message")]
public async Task<string> PushCustomMessageAsync(PlatformDataMessageDto param)
{
    //逻辑代码块
    return "OK";//成功返回OK即可
}
```

#### 5.1.4 配置说明

实施人员拿到用户(订阅者)提供的接口路径之后，需要按照如下的操作进行配置。

注意：该动作由阿克索的实施人员操作，用户(订阅者)只需要告知阿克索的实施人员(或者项目经理)，并保证提供的地址能够正常被请求即可。

##### 5.1.4.1 消息通知模板

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/WgZOZw9rARjelLX8/img/cc84288e-a521-4599-b037-3e642e2b2b86.png)

##### 5.1.4.2 设置接口地址

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/WgZOZw9rARjelLX8/img/db220d92-855b-4ca7-ac51-cea5968582ca.png)