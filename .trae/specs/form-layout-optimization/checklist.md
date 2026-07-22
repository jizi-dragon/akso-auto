# Checklist

- [x] `getFormLayouts` 函数实现正确，能查询对象的表单布局列表（GET Layout/LayoutList）
- [x] `getFormLayoutDetail` 函数实现正确，能获取布局详情含 sections 和 controls（GET Layout/LayoutDetail）
- [x] `saveFormLayout` 函数已改进，正确支持全量替换 sections + controls
- [x] `CONTROL_TYPE` 常量定义完整（8 种组件类型）
- [x] `lib/orchestrate.js` 中表单布局自动创建已移除（改用默认布局）
- [x] `lib/index.js` barrel 导出自动包含所有新增函数
- [x] `README.md` 第五节（表单布局）文档完整重写
- [x] README 中"成熟度总览"、"能力边界"、"API 路径速查"、"模块速查表"已同步更新
- [x] 所有 API 端点、请求体参数、响应格式与实操捕获一致
- [x] JSDoc 覆盖所有新增函数，包含完整使用示例
- [x] 版本号更新为 v0.5.1，核心 API 数量 14→16
