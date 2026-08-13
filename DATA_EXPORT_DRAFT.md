# 个人训练数据云端导出：修订方案粗稿

> 调查基线：GitHub 仓库 `JIDAIN/fish-cat-speed-math` 默认分支 `master`，最新提交 `60b8ea0`（2026-08-07）。
>
> 依据：当前 TypeScript 类型、训练/同步逻辑、Supabase migration、生成器及测试。未读取生产 Supabase 数据；生产 migration 是否均已执行、实际数据量和历史数据形态均**无法从代码确认**。

## 结论摘要

第一版导出应定义为：**当前已登录账号从 Supabase 可读取的全部、且 `owner_id` 为该账号的云端个人完成训练数据**。不读 IndexedDB，不与本地合并，不查询 `pk_challenges`，也不包含对方或胜负数据。

当前云端表和同步 RPC 只接受 `completed` 会话，且每条云端个人训练已经携带完整会话 JSON（冻结题组和逐题个人作答均在内）。普通训练与 PK 应战训练共用同一同步路径；以 `trainingSource` 区分 `normal` / `pk`。因此，现有数据足以支持后续在 Excel、Python 或 AI 中做题型、结构、速度、草稿和估算判定层面的复盘。

但有两个需要在设计中正面处理的事实：

- `completed_training_sessions.completed_at` 当前实际由会话 `startedAt` 写入，**不是真实完成时间**；不得导出时冒充完成时刻。
- 现有历史读取函数会按 RLS 读到本人和配对对象，且未实现显式分页。导出不能直接复用它，必须走“`owner_id = 当前 Auth UUID` + 分页”的专用云端读取路径。

## 1. 最终确认的功能边界

### 本功能做什么

- 用户主动点击后，导出当前登录账号在 Supabase 中**全部个人**训练记录。
- 范围固定，不提供对象、时间、题型、来源、状态或普通/PK 筛选。
- 导出普通训练与 PK 训练形成的个人训练；两者统一作为训练会话，保留来源字段。
- 输出结构化原始数据和少量稳定、可复算的基础派生字段，供外部工具复盘。
- 推荐同时提供 XLSX 和 JSON；它们是数据文件，不在 App 内生成任何分析结论、图表或建议。

### 本功能明确不做

- 不读取 IndexedDB、`sessionStorage` 或任何本地未同步数据；不回退本地。
- 不导出 active、abandoned、本地已完成但未同步的会话。
- 不查询或导出 `pk_challenges`、PK 已读回执、冻结题组副本、对手训练/身份/成绩、胜负或挑战状态。
- 不生成薄弱点、趋势、PK 对比、训练建议、统计报告或导入/恢复功能。

### 失败与权限原则

- 未登录（或 Supabase 未配置/无法取得有效账号身份）时，禁止导出并提示先登录；不生成文件。
- 云端任一步骤失败（含分页任一页失败）时，明确提示“导出失败”，不下载一个可能被误认为完整的残缺文件。
- 仅使用当前浏览器的现有 Supabase 登录态和 RLS；不使用 service role、管理员查询或额外权限。

## 2. 云端实际保存结构与状态边界

### 表与同步事实

云端训练表为 `public.completed_training_sessions`。关键列包括：

| 层级      | 当前实际字段/内容                                                                                  | 事实与用途                                                          |
| --------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 表列      | `session_id`（主键）、`owner_id`、`owner_role`                                                     | 云端唯一训练 ID 和归属；`session_id` 主键阻止同 ID 重复行           |
| 表列      | `question_type`、`subtype`、`question_count`                                                       | 为查询而冗余保存的会话元数据                                        |
| 表列      | `generator_version`、`grading_version`、`rating_version`、`schema_version`                         | 同步时传入的版本元数据                                              |
| 表列      | `session_data`（JSONB）                                                                            | 整个 `TrainingSession` 快照；是逐题导出的主要来源                   |
| 表列      | `created_at`                                                                                       | 数据库插入时间；当前表无 `updated_at` 列                            |
| 表列      | `completed_at`                                                                                     | 列名为完成时间，但同步 SQL 实际取 `session_data.startedAt` 转换写入 |
| JSON 会话 | 训练 ID、用户角色、题型/子模式、冻结题组、逐题 records、计时与状态、账户归属、评级、来源和 PK 关联 | 导出必须保留/解释的原始主体                                         |

客户端 `syncCompleted()` 只有当 `session.status === "completed"` 且存在 `ownerAccountId` 才调用 RPC。数据库函数也校验 `session_data.status = 'completed'`；表的 check constraint 再次要求该状态。**按当前代码与 migration，云端训练表只能保存 completed 会话，不能保存 active、abandoned 或其他状态。**

所以本功能的“全部个人训练”在当前实现中精确等于：导出时该账号云端可读、`owner_id` 为本人、状态为 `completed` 的全部同步会话。仍应把 `status` 原样导出，以便未来 schema 演进时不混同状态。

## 3. 普通训练与 PK 训练如何统一进入个人训练数据

### 已核实的路径

1. 普通训练完成后，页面先把 completed 会话写本地，再调用 `syncCompleted()` 写 `completed_training_sessions`。
2. 对手接受 PK 后，`createTrainingSession()` 用挑战冻结的题组创建个人会话，并设置 `trainingSource: "pk"` 与 `pkChallengeId`。
3. 该 PK 会话完成后，先通过**同一个** `syncCompleted()` 同步为当前用户的一条 completed 训练，再调用 `submitPKResult()` 把该会话 ID 关联回挑战。
4. 数据库函数在 PK 提交时验证：对手会话已属于当前用户、`pkChallengeId` 匹配、题组等于挑战冻结题组；这证明个人云端会话含有完整题组和个人 records。

因此导出个人 `completed_training_sessions` 即同时包含普通与 PK 个人表现。导出应将 `training_source` 标为：JSON 的 `trainingSource === "pk"` 为 `pk`，其余（含旧记录缺失该字段）为 `normal`；可原样保留可选 `pkChallengeId`，但不据此进一步查 challenge。

不读独立 PK 表不会丢失个人复盘的核心信息：个人题目、答案、判定、用时、草稿使用、题型、结构和来源均已在个人会话中。会丢失的是本功能明确排除的对手/胜负/挑战时间线信息。PK 发起方会话还在挑战表有 `frozen_session` 重复快照；个人导出不读取该重复副本，也不会把它算成第二次训练。

## 4. 后续复盘所需的云端数据粒度

### 训练记录：一训练一行

建议在 XLSX 的 `训练记录` 工作表及规范化 JSON 中提供以下字段。`原始` 指已保存于表列或 `session_data`；`派生` 指导出时从原始数据稳定计算。

| 字段组     | 建议字段                                                                                                                | 来源 / 说明                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 关联与归属 | `training_id`、`owner_id`、`owner_role`                                                                                 | 原始表列；ID 作为文本保留，避免 Excel 改写 UUID                                                          |
| 会话背景   | `status`、`training_source`、`pk_challenge_id`、`question_type`、`subtype`                                              | 原始 JSON；来源缺失按旧数据规则映射为 `normal`，但保留原始缺失状态说明                                   |
| 时间       | `started_at_ms`、`started_at_iso`、`cloud_created_at`、`cloud_completed_at`                                             | 开始时间是原始 JSON；表 `created_at` 是原始云端时间；`cloud_completed_at` 存在但语义错误，详见“数据质量” |
| 规模与结果 | `configured_question_count`、`actual_question_count`、`answered_count`、`correct_count`、`total_effective_ms`、`rating` | 原始字段或由 records/题组直接计数；题量分析以冻结 `questions.length` 为准                                |
| 基础派生   | `accuracy_ratio`、`average_question_ms`、`median_question_ms`                                                           | 派生，分别保留 0–1 比率和毫秒，避免展示格式成为数据语义                                                  |
| 版本       | `generator_version`、`grading_version`、`rating_version`、`schema_version`、`rating_snapshot_version`                   | 前四项为表列；评分快照版本在 JSON 内（可能缺失）                                                         |
| 计时与兼容 | `pause_duration_ms`、`updated_at_ms`、`sync_status`、`synced_at_ms`                                                     | JSON 原始字段，均要说明局限；详情见后文                                                                  |

真实 `completed_at` 目前没有可靠来源，第一版的规范字段 `completed_at_ms` / `completed_at_iso` 应为空值，并在字段说明明确“当前版本未采集”。可以另保留表的原始 `cloud_completed_at`，但须命名为 `cloud_completed_at_legacy_started_at` 或等效明确名称，绝不能作为完成时刻或长期进步排序依据。

### 逐题记录：一冻结题一行

逐题是未来发现薄弱点的核心。建议以 `session.questions` 为主序列生成一行/题，并按 `question.id` 关联 `records`；这样即使历史异常导致题组与 records 不一致，也不会丢失冻结题。对每行声明 `answer_record_present`；用户答案空字符串、`"0"` 与未作答必须分别保留，不能以真假值合并。

| 字段组     | 建议字段                                                                                                                                                | 来源 / 说明                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 关联与排序 | `training_id`、`question_id`、`question_index`、`answer_record_present`                                                                                 | 原始 ID/冻结数组顺序；序号可为 1-based 派生显示字段                                    |
| 题目与答案 | `question_type`、`subtype`、`prompt`、`correct_answer`、`user_answer`                                                                                   | 原始题目/record；`user_answer` 是文本，空字符串保留为空字符串，缺记录则用空值          |
| 判定与行为 | `is_correct`、`accuracy_level`、`time_used_ms`、`used_scratchpad`、`restart_count`                                                                      | 原始 record；缺记录保持空值，不猜测为错误或 0                                          |
| 难度与结构 | `difficulty_level`、`difficulty_tags`、`primary_structure`、`secondary_tags`、`generation_rule_version`                                                 | 原始题目。标签在 XLSX 用 JSON 字符串（如 `["near_ten"]`）或明确分隔文本；JSON 保留数组 |
| 估算规则   | `accepted_range_min`、`accepted_range_max`、`accepted_range_json`                                                                                       | 原始题目 `acceptedRange`；当前 3% 估算题可据此辨识 `exact / accepted / wrong`          |
| 题型专属   | 高价值通用操作数列 `operand_a`、`operand_b`、`operand_c`、`operand_d`、`quotient`、`rule`、`numerator`、`denominator`、`percent_answer`（仅适用时填写） | 从原始 `data` 提取；不适用为空值，不把 0 变空                                          |
| 保真字段   | `question_data_json`、`accepted_range_json`                                                                                                             | `data` 原样 JSON 序列化；不可统一字段不会丢失                                          |

生成器在题目创建时把 `data`、难度、主结构、辅助结构、生成规则版本与可选接受范围写入 `GeneratedQuestion`；完成训练同步时将整个会话 JSON 直接放进 `session_data`。因此当前新会话已将这些结构信息同步到云端，不只是前端运行时状态。

例如已保存的主结构覆盖：借/进位与连续借/进位、接近整十、11–19 因数、小个位数、不同商区间/首位误导/接近估算边界、分数同向变化/接近二分之一，以及多加数列进位负荷；两位乘法还会以辅助标签保留重叠特征。原始 `data` 对不同题型保存操作数和特定语义，例如除法的 `a`、`b`、`quotient`、`rule`，分数题的分子分母和 `percentAnswer`，四项加法的列进位数据。完整 `question_data_json` 是防止题型演进后损失信息的必要字段。

## 5. 数据质量核实与处理建议

| 问题              | 当前实际情况                                                                                                                  | 第一版导出处理                                                                      | 是否需修复/是否阻塞导出                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 真实完成时间      | `TrainingSession` 无 `completedAt`；表 `completed_at` 实际写 `startedAt`                                                      | `completed_at` 留空；保留并明确标注错误语义的 legacy 表列                           | 值得从新版本起新增真实 `completedAt`；**不阻塞**导出，但阻塞“按完成时刻”的可信分析 |
| 长期时间趋势      | 可按训练开始时间排序；不能声称按完成时刻，跨长会话会偏差                                                                      | 字段说明限定为开始时间趋势                                                          | 新字段可改善；不阻塞                                                               |
| 完整逐题数据      | 新同步将含 `questions`、`records` 的整个完成会话 JSON 上传                                                                    | 训练和逐题双层导出；异常不一致显式标记                                              | 不阻塞                                                                             |
| 结构/专属数据     | 新题目内已有结构、标签、`data`、接受范围并随 JSON 同步                                                                        | 展开少量稳定操作数 + 完整 `question_data_json`                                      | 不阻塞；旧记录可能是 `legacy_unknown` 或缺字段                                     |
| `pauseDurationMs` | 类型有字段，但计时实现只累积 `accumulatedMs`；当前未见对 `pauseDurationMs` 的写入，创建/兼容默认 0                            | 原样导出但字段说明“通常为 0，不能代表真实暂停时长”                                  | 可后续清理/采集；不阻塞                                                            |
| `restartCount`    | 新交互是整组重开，创建新会话；该字段仅保留旧版逐题重开兼容，当前提交会携带 `currentRestartCount`，新流程通常为 0              | 原样导出但标为 legacy-compatible，不用它推断当前重开行为                            | 不阻塞                                                                             |
| 同 ID 重复        | `session_id` 是主键，RPC 对同所有者重复调用幂等返回；同 ID 不会有两行                                                         | 无需数据去重；可校验返回的 `training_id` 唯一性                                     | 不阻塞；生产已存异常无法从代码确认                                                 |
| 旧数据归一化      | `normalizeSession/Question/Record` 会补默认值、过滤无法解析会话，并修正已知全角比较符号；未知 JSON 字段不会映射到类型对象     | JSON 不应只输出归一化对象                                                           | 见下一节；不阻塞，但影响归档设计                                                   |
| 云端更新时刻      | 表无 `updated_at`，已同步会话不可更新；JSON 的 `updatedAt` 主要服务 active 本地保存                                           | `cloud_updated_at` 留空；`session_updated_at_ms` 如存在可原样带出但不称云端更新时间 | 不阻塞                                                                             |
| 查询分页          | 当前 `readCloudHistory()` 只 `.select("session_data").order(...)`，未 `.range()` / 分页；Supabase 默认/服务端最大行数可能截断 | 导出专用查询必须显式按页读取直到最后一页                                            | **第一版实施前必须处理**                                                           |
| RLS               | 现有策略允许本人或固定配对对象读取 completed 表；现有历史读取因此可读到对方                                                   | 导出查询必须额外 `.eq("owner_id", auth.uid())`；仍由 RLS 执行授权                   | **第一版实施前必须处理**                                                           |

### JSON：原始、规范化与未知字段

当前 `readCloudHistory()` 将 `session_data` 直接断言为 `TrainingSession`，并未调用 IndexedDB 的归一化函数；而本地 `normalizeSession` 会丢弃类型之外的未知属性。因此导出不应经由本地归一化，也不应把当前 UI 的 `readCloudHistory()` 结果作为唯一 JSON 来源。

推荐导出专用查询选择表列与**原始 `session_data` JSONB**，并形成一个版本化包装：

- `raw_cloud_rows`：每条原始表列与原始 `session_data`，用于机器可读归档、未来迁移/恢复预留和未知字段保留；
- `normalized_export`：基于已知字段生成的训练行与逐题行，供 XLSX 和外部分析稳定使用；
- `export_metadata`：导出 schema 版本、生成时间、时区显示规则、范围声明、字段局限和警告数量。

这比“只原始 JSON”更易分析，也比“只规范化 JSON”更兼容旧/未来字段。代价是文件更大和需要维护一层导出 schema；在当前项目规模下这是合理成本。该 JSON 是“完整数据导出 / 机器可读归档”，**不是**已验证可恢复备份，因项目尚无导入和恢复功能。

## 6. 云端专用读取路径、权限、分页与错误处理

导出代码应独立于历史页面读取：

1. 通过 `currentIdentity()` 获取当前已登录、已分配角色的账号；没有身份即失败。
2. 对 `completed_training_sessions` 读取导出必需表列（至少 `session_id, owner_id, owner_role, question_type, subtype, question_count, generator_version, grading_version, rating_version, schema_version, session_data, completed_at, created_at`）。
3. 显式加 `owner_id = identity.id`，并按稳定排序键分页。建议排序 `completed_at desc, session_id desc`；虽前者实际是开始时间，但可稳定读取。实现时需验证 Supabase 对复合排序/游标或 offset 分页的行为。
4. 每页成功后仅暂存内存；只有确认读到最后一页且所有页成功后，才构造 XLSX / JSON 并触发下载。
5. 任何查询、解析或生成失败均取消下载并给出明确错误；不得改用 IndexedDB、缓存历史或对方数据。

RLS 本身会限制为本人或配对对象；额外的 `owner_id` 过滤将结果收窄到本人，而不是扩大权限。导出不能信任前端 `userId`（fish/cat 显示角色）做归属判断，应使用表的 `owner_id` 与 Auth UUID。

大量历史的风险来自三个阶段：全部行进入内存、逐题扁平化、浏览器生成 XLSX/JSON blob。第一版可先采用分页拉取、进度提示、单次生成和保守页大小；实施前用合成大数据压测。若规模增长，再考虑 Worker、流式 ZIP/JSON 或服务端受 RLS 约束的导出任务，但不应牺牲“失败不产出残缺文件”的原则。

## 7. 推荐文件形式与结构

### 同时提供 XLSX 与 JSON：建议成立

| 文件 | 职责                                      | 建议结构                                                                 |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------ |
| XLSX | 人工查看、筛选、透视、交给 Excel 后续分析 | `训练记录`、`逐题记录`、`字段说明` 三个工作表；无图表、无结论、无推荐    |
| JSON | 原始云端数据归档、程序/AI/未来工具读取    | 带 `export_metadata`、`raw_cloud_rows`、`normalized_export` 的版本化对象 |

XLSX 是主要的人类分析入口，JSON 是保真与机器处理入口；二者都从同一次、已完整成功的云端读取结果生成。项目当前没有 XLSX 生成依赖，实施需新增经评估的浏览器端库或等价方案；JSON 可用浏览器原生 Blob 生成，成本较低。

### 表格约定

- 列标题优先中文，且在 `字段说明` 同列给出稳定英文 machine key；JSON 用稳定英文 key。
- UUID、题目 ID、用户答案、题面、版本号均按文本写入；XLSX 对以 `=`, `+`, `-`, `@` 开头的文本做公式注入防护。
- 同时保存时间戳毫秒（数值）和 ISO-8601（含 `+08:00` 或明确 UTC）；字段说明写明展示时区。不要使用浏览器本地化字符串作为唯一时间数据。
- 时长原始单位统一毫秒；可附秒数派生列供阅读。正确率原始派生保存 0–1 小数，XLSX 可格式化为百分比。
- 不适用使用空值；未知/旧数据使用明确文本 `legacy_unknown` 或空值并在说明页解释。不要用 0 代替缺失。
- 数组在 XLSX 用 JSON 文本或明确约定分隔符；`question_data_json` 始终保留原始 JSON 字符串。
- 文件名可含 `speed-math-personal-training-export_YYYY-MM-DDTHH-mm-ss+08-00`；不要在文件名暴露邮箱。导出时间写入元数据。

## 8. 大致实施阶段

1. **定义并测试导出边界。** 专用身份检查、个人 `owner_id` 过滤、分页读取和“任一页失败不下载”。
2. **建立导出模型。** 保留原始云端行，生成稳定的训练级和逐题级规范行；对旧数据/缺 record/未知字段发出元数据警告而非猜测。
3. **实现 JSON 与 XLSX 输出。** 先完成 JSON，再以同一模型生成三工作表 XLSX；添加字段说明、文本安全和格式测试。
4. **性能与真实环境验证。** 覆盖未登录、RLS 对方行、普通/PK、估算 accepted、旧字段、同 ID、空数据、分页、多页错误、超大历史和 Excel 打开行为。
5. **后续数据采集（独立于导出）。** 从新版本起新增真实 `completedAt`；可按确有需求再设计暂停事件等行为采集。旧数据不回填猜测值。

## 9. 确定的技术判断

- 云端训练表当前只会保存 completed 会话；导出范围无需处理 active/abandoned。
- 完成的普通与 PK 个人会话共用同步路径，均含完整冻结题组与个人逐题作答；`trainingSource` 足以做统一来源区分。
- 不读 PK challenge 不损失个人计算复盘所必需的题目、作答、判定和用时，只排除了本功能不需要的对手/胜负上下文。
- 结构标签、接受范围和题型专属 `data` 已作为题目 JSON 一部分同步到云端；“固定列 + 完整 data JSON”是最稳妥的逐题导出方式。
- 真实完成时间目前缺失，`completed_at` 被错误地写为开始时间；不能用它替代完成时间。
- 现有历史读取函数不满足导出边界：它会读取对方可见记录且无显式分页。个人过滤与完整分页是实施前的必要条件。
- 直接保留原始云端 JSON，同时产出规范化分析结构，比仅输出前端归一化对象更兼容未来字段与旧数据。

## 10. 仍需用户决定的少量事项

1. 是否接受首发同时交付 XLSX 和 JSON（推荐），以及 XLSX 是否必须支持特定桌面 Excel 版本/平台？
2. 是否在下一次数据 schema 演进中开始采集真实 `completedAt`？建议接受；旧记录保持为空。
3. `pkChallengeId` 是否在 XLSX 训练表可见，还是仅保留在 JSON 原始数据中？它不暴露对手信息，但属于 PK 业务关联。
4. 对非常大的历史量，第一版可接受“浏览器生成时显示进度并可能耗时”，还是需要一开始就投入 Worker/服务端导出任务？
