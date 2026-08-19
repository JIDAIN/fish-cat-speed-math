# 个人训练数据云端导出

登录后可在“历史记录”中一键导出两份范围相同的文件：XLSX 用于筛选、透视和人工分析，JSON 用于机器可读归档及未来工具处理。

导出只读取当前账号在 Supabase 中已同步的 completed 个人训练，包含普通训练和 PK 训练的个人作答。它不读取当前设备的本地/未同步记录，不包含对手、胜负、PK challenge 或配对对象数据。

XLSX 包含“训练记录”“逐题记录”“字段说明”。逐题记录以冻结题组为准，即使某题没有作答记录也会保留一行。题目结构、操作数、答案、判定、有效用时、草稿使用和完整题目 `data` 都会导出。

JSON 同时保留 Supabase 原始行和规范化分析结构。它是机器可读归档，不是已验证可恢复的备份；项目尚未提供导入或恢复功能。

时间同时使用 Unix 毫秒和 ISO-8601 表达；ISO 时间固定使用 `Asia/Shanghai`（`+08:00`），时长单位为毫秒，正确率为 0–1（XLSX 以百分比格式显示）。新版本训练会记录真实完成时间；旧记录没有真实完成时间时保持为空。原表的 legacy `completed_at` 历史上实际保存的是开始时间，只在 JSON 原始行中保留，不能作为真实完成时间使用。

导出会完整分页读取云端记录。任一读取或文件生成步骤失败时不会下载部分文件。

# 专项训练导出补充

专项训练与普通训练同样导出为 completed 训练和逐题记录；以 `question_type` / `subtype` 区分。其中“两位数×两位数”固定使用 `question_type: two_by_two_multiply`，`subtype: standard` 表示综合训练，`subtype: carry_intensive` 表示进位强化；不再导出独立的两位数乘法专项类型。逐题表新增 `special_baseline`、`relative_deviation`、`correction_direction` 与 `carry_load`，完整专项/分数比较分析元数据保留在 `question_data_json`。字段含义及题目规则见 [SPECIAL_TRAINING.md](./SPECIAL_TRAINING.md)。
