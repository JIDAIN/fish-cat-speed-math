# 放缩法 V2 决策补充：旧版直接删除

日期：2026-09-02

本文件覆盖 `SCALING_METHOD_V2_PLAN.md` 与 `SCALING_METHOD_V2_AUDIT.md` 中所有“保留旧整百放缩修正历史兼容”的描述。

## 最终决定

旧版「整百放缩修正」不再保留兼容层，也不再考虑其历史数据。

实施时直接删除：

- `special_hundred_scaling_division` 题型；
- `hundred_scaling` subtype；
- 旧 `HUNDRED_SCALING_DEVIATION_QUOTAS`；
- 旧 `HUNDRED_SCALING_BASE_QUOTAS`；
- `buildHundredScalingQuestion` 及其生成分支；
- 旧训练入口和旧名称；
- 旧放缩法专属测试；
- 旧导出字段 `special_baseline / relative_deviation / correction_direction`（若没有其他题型使用）；
- 为旧放缩法专门设计的 storage/history 兼容代码。

旧本地或云端放缩法训练记录可以被新版代码忽略，不要求继续展示、恢复或迁移。

## 新版唯一内部标识

新版统一使用：

- `questionType = "scaling_method"`
- `subtype = "scaling_method"`
- 产品名称：`放缩法`

不再存在 V1/V2 双 key 并存设计。

## 对现有系统的影响

其他题型的历史兼容、PK、云同步和数据导出机制保持不变。此次“无需历史兼容”仅针对旧版整百放缩修正。

新版仍然遵循：

- 题目与四个选项冻结在 `GeneratedQuestion`；
- 用户辅助填写和事件时间戳属于 `QuestionRecord`；
- 9 个辅助框全部可选；
- 未填写字段忽略；
- 最终选项是唯一正式答案；
- 原始输入事件保存到 session JSONB，耗时以后由分析层派生。
