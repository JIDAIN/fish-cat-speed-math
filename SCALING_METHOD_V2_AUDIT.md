# 放缩法 V2 集成审计结论

> 分支：`feature/scaling-method-v2`
>
> 阶段：开发准备 / 架构审计
>
> 本文只记录新版放缩法与现有训练、存储、PK、云同步、历史和导出链路的集成结论，不包含正式功能实现。

## 1. 题型标识：新增 V2 key，不复用旧 key

结论：新版使用新的内部题型标识，旧题型只保留历史兼容。

建议：

- 旧历史题型继续保留：`special_hundred_scaling_division` + `hundred_scaling`；
- 新版题型新增：`scaling_method` + `scaling_method`；
- 训练入口只显示新版「放缩法」；
- 旧「整百放缩修正」不再作为新训练入口生成题目；
- 旧云端和本地历史仍按原 key 读取和展示，不重写、不迁移、不用新版规则重新解释。

原因：

1. 旧题和新版题的生成逻辑、界面、正式答案形式都已经不同；
2. 复用旧 key 会让历史统计无法可靠区分 V1 和 V2；
3. 新 key 可以避免后续导出、PK 和历史详情里依赖 generator version 猜测题型语义；
4. 用户看到的产品名称仍然只是「放缩法」，内部 key 不影响界面。

## 2. 旧生成器必须整体退出新训练链路

现有旧生成器的核心特征包括：

- 固定整百基准配额 `600 / 700 / 800 / 900`；
- 偏差配额集中在 `0% - 4%`；
- 单题直接生成一个数值商作为 `answer`；
- 题目数据围绕旧的 `specialBaseline / relativeDeviation / correctionDirection` 等字段；
- `generateSet()` 对 `special_hundred_scaling_division` 有单独的配额分支。

这些规则不应该继续参与新版出题。

实施时保留旧函数的唯一目的，是让已有冻结历史/PK数据保持可读；新训练统一走新的 `scaling_method` generator。

## 3. 新版 GeneratedQuestion 的职责

新版题目本身保存“题目真值和冻结选项”，不保存用户过程。

建议问题数据包含：

```ts
interface ScalingQuestionData {
  numerator: number;
  denominator: number;
  options: ScalingOption[];
  correctOptionId: "A" | "B" | "C" | "D";

  // 生成器推荐/诊断用，而非强制用户填写
  preferredBaselines: number[];
  acceptableBaselines: number[];
  structure: "round_baseline" | "special_baseline" | "multiple_relation";
  firstOrderSufficient: boolean;

  // 用于复核和后续诊断
  exactQuotient: number;
}
```

选项必须随问题冻结。PK 对手拿到的必须是完全相同的题目和四个选项，不能在答题时二次随机生成。

## 4. 用户过程数据放在 QuestionRecord，不放进 GeneratedQuestion

结论：每个用户自己的辅助填写行为属于“作答记录”，不能写进冻结题目。

新版单题记录在现有 `QuestionRecord` 上增加可选字段：

```ts
interface ScalingProcessRecord {
  questionPresentedAt: number;
  fields: {
    delta?: ScalingInputState;
    baseline?: ScalingInputState;
    r?: ScalingInputState;
    rSquared?: ScalingInputState;
    baseResult?: ScalingInputState;
    firstCorrection?: ScalingInputState;
    secondCorrection?: ScalingInputState;
    firstResult?: ScalingInputState;
    secondResult?: ScalingInputState;
  };
  optionEvents: ScalingOptionEvent[];
  submittedAt: number;
}
```

每个字段都允许不存在。不存在即“用户没有填写”，分析时忽略。

## 5. 输入事件采用原始事件序列

每次真正修改数字内容都记录：

```ts
interface ScalingInputEvent {
  at: number;
  action: "digit" | "decimal" | "toggle_sign" | "backspace" | "clear";
  value: string;
}
```

不只保存 `firstInputAt` / `lastInputAt`，因为用户可能：

- 跨字段来回填写；
- 回头修改；
- 先填 R1 再补 r；
- 清空重算；
- 完全跳过某些框。

最终耗时由分析层根据原始事件计算。

## 6. 数字键盘不能直接沿用现有 onChange 事件语义

现有 `NumberPad` 对外只回传“修改后的字符串”，会丢失动作语义。

新版不应通过比较新旧字符串来猜测用户做了什么，而应该让键盘组件或放缩法专用包装层明确上报：

- digit；
- decimal；
- toggle_sign；
- backspace；
- clear。

要求：

- 普通题型现有行为不受影响；
- 可以给 `NumberPad` 增加可选 `onAction` 回调，保持旧调用方兼容；
- 或建立 `ScalingNumberPad` 包装组件复用视觉，不复制整套 CSS。

优先方案：给共享 NumberPad 增加可选 action callback，以避免两套键盘长期漂移。

## 7. 提交流程不能直接复用 submitCurrentAnswer

现有 `submitCurrentAnswer()` 的前提是 `currentAnswer` 非空，并把它作为唯一字符串答案送入 `grade()`。

新版放缩法是：

- 9 个过程框全部可空；
- 正式答案是 A/B/C/D；
- 过程数据需要与最终选项一起冻结进 QuestionRecord。

因此实施时新增专属提交函数，例如：

`submitScalingAnswer(...)`

它负责：

1. 验证已选择选项；
2. 根据 `correctOptionId` 判定正式正确性；
3. 冻结所有辅助字段当前值及事件；
4. 保存 `timeUsedMs`；
5. 推进 `currentIndex`；
6. 完成最后一题时沿用现有 session completion / sync 流程。

不要把九个辅助值拼接进 `currentAnswer`。

## 8. TrainingSession 需要单独的“当前放缩题草稿状态”

因为用户在做到一半时可能切后台、刷新或暂存，当前题尚未产生 QuestionRecord，但已经存在过程输入事件。

如果这些事件只存在 React component state，页面恢复后会丢失。

因此 TrainingSession 需要增加可选的当前题状态，例如：

```ts
currentScalingDraft?: {
  questionId: string;
  activeField?: ScalingField;
  fields: Partial<Record<ScalingField, ScalingInputState>>;
  optionEvents: ScalingOptionEvent[];
  selectedOption?: "A" | "B" | "C" | "D";
  questionPresentedAt: number;
};
```

要求：

- 仅 `scaling_method` 使用；
- 每次有效输入/选项变化后与现有 active session 自动保存机制协作；
- 提交后把 draft 冻结进 QuestionRecord，然后清空 draft；
- 旧 session 没有该字段时正常读取。

## 9. 本地存储存在一个现有兼容缺口，必须一并修复

当前 `storage.ts` 使用单独的 subtype whitelist 做反序列化校验，但该列表没有完整覆盖 `types.ts` 已声明的 subtype。

目前至少可见：

- `carry_intensive` 已存在于 `Subtype`，但 storage whitelist 未包含；
- `hundred_scaling` 已存在于 `Subtype`，但 storage whitelist 未包含。

结果是某些对应类型的本地 session 在重新读取时可能被判为无效。

新版开发时必须：

- 把 subtype 校验改成单一共享来源，避免 `types.ts` 和 `storage.ts` 两份列表漂移；
- 新增 `scaling_method` subtype；
- 增加旧 `hundred_scaling` 本地历史/active session 兼容测试；
- 增加 `carry_intensive` 回归测试。

这属于兼容性修复，不改变旧数据含义。

## 10. PK 链路结论

现有 PK 创建时把已同步完成 session 的 `session_data` 整体保存为 `frozen_session`，对手开始挑战时使用：

- `questionType`；
- `subtype`；
- `questions`；

创建一个新的 TrainingSession。

因此新版只要满足：

1. 四个选项和正确选项随 question 冻结；
2. 新题型 key / subtype 可被创建和反序列化；
3. 对手自己的 `currentScalingDraft` 从空状态开始；
4. 最终响应 session 的 `questions` 与挑战 frozen questions 完全一致；

就可以沿用现有 PK 完整性检查，不必为放缩法新建 PK 表。

注意：挑战表当前保存挑战者完整 session，因此未来如果希望减少 frozen payload 或不把过程事件复制到挑战记录，可单独做 PK 数据最小化改造；这不是本次 V2 上线的阻塞项。

## 11. Supabase 结论：第一阶段不改表结构

现有 `completed_training_sessions.session_data` 是 JSONB，云同步把 TrainingSession 整体写入其中。

因此新版：

- question options；
- QuestionRecord.scalingProcess；
- currentScalingDraft（仅 active，本身不会上传 completed 后的草稿）；
- 各类事件时间戳

都可以沿用当前 JSONB 持久化模型。

第一阶段不增加专用 SQL 列。

需要增加 round-trip 测试，验证：

`local -> completed session -> sync payload -> cloud read -> TrainingSession`

事件数组和所有 `at` 时间戳无损保留。

## 12. completed session 中不得残留 currentScalingDraft

正式提交最后一道题后：

- 当前题过程必须已经冻结到对应 QuestionRecord；
- `currentScalingDraft` 必须清空；
- completed session 不应保存未提交的临时字段状态。

这样可以避免导出和云历史把“当前草稿”误认为正式过程记录。

## 13. 历史与评分兼容

正式成绩继续基于 QuestionRecord 的：

- `isCorrect`；
- `accuracyLevel`；
- `timeUsedMs`。

因此现有 `sessionMetrics()` 和 PK 胜负比较原则上可以继续工作。

新版 `userAnswer` 对放缩法统一保存最终选项字符串 `A/B/C/D`，保证通用历史代码仍能读取一个正式答案。

过程分析另读 `record.scalingProcess`，不改变现有总正确率语义。

## 14. 导出必须升级

raw cloud rows 已经会保留完整 JSONB，但标准化问题表需要新增放缩法数据。

至少要导出：

- numerator / denominator；
- four options；
- correct option；
- selected option；
- firstOrderSufficient；
- structure；
- 每个辅助字段最终填写值；
- 每个辅助字段完整 events JSON；
- questionPresentedAt；
- optionEvents JSON；
- submittedAt。

派生的“字段耗时”可以后续再增加，不在第一版导出里写死口径。

## 15. 生成器 V2 的开发边界

进入正式编码后的第一阶段，只开发纯函数数学核心和生成器，不先做 UI。

优先新增：

- `SCALING_METHOD_STRUCTURE_QUOTAS`；
- 基准候选生成；
- 基准可算性评分；
- 整十/整百结构；
- 特殊友好基准结构；
- 倍数型结构；
- r / 一阶 / 二阶真值计算；
- 一阶是否足够区分选项的判定；
- 考试型四选项生成；
- deterministic tests。

初始结构比例继续按产品方案：

- 40% 整十/整百；
- 35% 特殊友好基准；
- 25% 倍数型。

## 16. 正式开发顺序

### Phase 1：类型与纯数学核心

- 新增 `scaling_method` type / subtype；
- 保留 legacy key；
- 建立独立 scaling math helpers；
- 建立新 generator；
- 建立 deterministic generator tests；
- 修复 storage subtype 单一来源问题。

### Phase 2：session / record 数据模型

- ScalingInputEvent；
- ScalingInputState；
- currentScalingDraft；
- scalingProcess；
- 专属 submit 函数；
- local storage round-trip tests。

### Phase 3：专属 UI

- 新版单页放缩布局；
- 使用现有薄荷绿视觉；
- 9 个非必填过程框；
- active field；
- 共享数字键盘 action callback；
- 四选项；
- 不显示小提示。

### Phase 4：历史 / 云同步 / PK / 导出

- history details；
- Supabase round-trip；
- PK frozen question parity；
- export normalized columns / event JSON；
- legacy history regression。

### Phase 5：Preview 验证

- lint；
- unit tests；
- build；
- Vercel Preview；
- 手机布局实测；
- 确认后再考虑合并 master。

## 17. 本阶段最终决策

准备阶段的关键架构已经确定：

- 新版不复用旧内部题型 key；
- 旧整百放缩只作为历史兼容；
- 新题目保存冻结选项，用户过程保存到 QuestionRecord；
- 未提交过程先放在 TrainingSession.currentScalingDraft；
- 每次内容修改保存原始 timestamp event；
- 最终选项是唯一正式成绩；
- Supabase 第一阶段继续使用 JSONB，不建新表；
- PK 沿用冻结问题集机制；
- 标准化导出后续显式增加过程事件字段；
- 正式编码从纯数学和生成器开始，而不是从页面开始。
