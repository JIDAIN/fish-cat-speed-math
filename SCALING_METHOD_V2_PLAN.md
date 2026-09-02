# 放缩法 V2 开发方案

> 状态：开发准备阶段
>
> 分支：`feature/scaling-method-v2`
>
> 本文用于固化新版「放缩法」的产品、数学、数据、出题、交互与兼容方案。在本阶段不修改生产逻辑、不修改 Supabase schema、不发布到 production。

## 1. 改造目标

将现有题型「专项：整百放缩修正」升级为「放缩法」。

旧实现围绕固定整百基准（600/700/800/900）和较小偏差生成题目，无法覆盖真实资料分析中整十/整百、特殊友好基准、倍数关系、不同量级等放缩情形，因此新版不在旧规则上继续修补，而是在保留旧历史数据可读性的前提下，引入 V2 生成逻辑和专属训练界面。

新版训练目标不是“求一个精确商”，而是训练：

1. 识别可放缩基准；
2. 判断分母相对基准的方向与差值；
3. 估计相对偏差 r；
4. 得到基准结果；
5. 做一阶修正；
6. 必要时做二阶修正；
7. 根据考试型选项判断何时停止计算。

## 2. 已确认的界面原则

### 2.1 页面结构

新版「放缩法」使用独立训练界面，不复用普通训练题的“题目 + 单一答案框”交互。

保留现有项目训练页的顶部结构和整体视觉语言，包括：

- 返回；
- 当前题号 / 总题数；
- 总计时；
- 草稿入口；
- 底部数字键盘。

不增加任何额外的小提示文案。

### 2.2 视觉样式

布局以确认过的新版放缩法设计稿为准，但颜色必须统一到当前项目已有设计系统：

- 浅薄荷绿页面背景；
- 深墨绿色主文字；
- 淡绿色输入框、按钮、键盘；
- 灰绿弱边框；
- 正确/错误状态才使用必要的状态强调色；
- 不使用蓝、红、紫、绿多色模块作为常态视觉编码。

### 2.3 辅助输入框

页面提供以下 9 个辅助过程框：

1. 带符号差值 Δ；
2. 基准数 B0；
3. r（%）；
4. r²（%）；
5. 基准结果 Q；
6. 一阶修正量；
7. 二阶修正量；
8. 一阶结果 R1；
9. 二阶结果 R2。

这些输入框全部是辅助工具，不是必填项。

用户可以：

- 全部填写；
- 只填写部分；
- 任意顺序填写；
- 多次修改；
- 一个也不填，直接选择选项并提交。

未填写的字段在过程诊断和耗时统计中直接忽略，不视为错误，也不记 0 秒。

### 2.4 差值符号约定

差值固定定义为：

`Δ = B0 - B`

例如：

- 原分母 B = 424；
- 基准 B0 = 400；
- Δ = -24。

差值输入框初始默认显示正号 `+`。用户通过数字键盘的 `±` 键切换正负号。

该符号约定必须在：

- UI；
- 生成器；
- 正确值诊断；
- 历史详情；
- 数据导出；
- 测试

中保持完全一致。

## 3. 数学定义

### 3.1 r 的基准

内部标准定义：

`r = |B - B0| / B0`

理由：放缩后分母可写成 `B0(1 ± r)`，一阶、二阶展开直接对应用户的修正过程。

### 3.2 分母比基准大

当：

`B = B0(1 + r)`

则：

`A / B = Q / (1 + r)`

其中 `Q = A / B0`。

二阶展开：

`A / B ≈ Q(1 - r + r²)`

因此：

- 一阶修正方向为负；
- 二阶修正方向为正。

### 3.3 分母比基准小

当：

`B = B0(1 - r)`

则：

`A / B = Q / (1 - r)`

二阶展开：

`A / B ≈ Q(1 + r + r²)`

因此：

- 一阶修正方向为正；
- 二阶修正方向仍为正。

### 3.4 用户 r 与真实 r 分离

程序不能假设用户一定输入精确 r。

需要区分：

- `trueR`：由题目与基准精确计算的真实相对偏差；
- `userR`：用户实际输入的 r；
- `trueRSquared`；
- `userRSquared`。

用户可以故意使用近似档位，例如真实 8.7% 时输入 9%。因此过程诊断不能简单要求每个过程值与精确值完全一致，而应支持合理误差范围和“最终选项安全性”分析。

## 4. 答题与评分原则

### 4.1 正式成绩

最终选项是唯一正式答题结果。

单题正式成绩字段：

- `selectedOption`；
- `correctOption`；
- `finalCorrect`。

辅助框不作为提交前置条件，也不因留空扣分。

### 4.2 过程诊断

若用户填写某个辅助框，则程序可对该字段进行过程诊断。

每个字段状态建议为：

- `not_attempted`；
- `correct`；
- `acceptable`；
- `wrong`。

其中：

- `not_attempted` 不计入过程正确率；
- `acceptable` 用于近似 r、近似 Q、一阶/二阶近似等情况；
- 最终选项正确与否独立于过程诊断。

### 4.3 不强迫二阶

二阶不是独立训练模式，也不是每题必须计算。

题目应覆盖：

- 一阶已经足以区分选项；
- 一阶结果接近两个选项，需要二阶才能安全判断。

用户一阶即可确定答案时直接提交，应视为正常甚至更优的考试行为。

## 5. 输入事件与计时设计

### 5.1 设计原则

不保存“固定步骤耗时”，而保存原始行为事件。

原因：用户可能不按预设顺序填写，并且可能修改、回填、跳过。

### 5.2 每个辅助字段保存事件序列

建议每个辅助输入框保存：

```ts
interface ScalingInputState {
  value: string;
  events: ScalingInputEvent[];
}

interface ScalingInputEvent {
  at: number; // Unix ms
  action:
    | "digit"
    | "decimal"
    | "toggle_sign"
    | "backspace"
    | "clear"
    | "focus";
  value: string; // 该事件后的完整字段值
}
```

是否保留 `focus` 事件可在实现时结合现有输入组件决定；数字输入、符号、退格、清空事件必须记录。

关键要求：每一次实际修改字段内容，都写入时间戳。

### 5.3 题目级事件

题目还应保存：

- `questionPresentedAt`；
- `optionEvents`；
- `submittedAt`。

选项如允许改选，则同样保存每次选择事件，而不是只保存最后一次选择。

### 5.4 后台派生耗时

原始事件落库后，分析层再派生：

- 某字段首次输入前的思考时间；
- 相邻有效字段之间耗时；
- 某字段首次输入到最后一次修改的编辑跨度；
- 回头修改次数；
- 一阶结束到最终选项之间耗时；
- 二阶结束到最终选项之间耗时；
- 完全不使用辅助框时的直接判断耗时。

派生算法不写死在数据结构中，避免以后改变分析口径时丢失原始信息。

### 5.5 未填写字段

若某字段没有任何内容修改事件：

- `attempted = false`；
- 不生成该字段耗时；
- 不参与平均值；
- 不作为错误字段。

## 6. 新版题目生成逻辑

### 6.1 不再以固定“整百”作为题型定义

V2 的核心是“存在实战价值的可放缩结构”，不是固定分母位数或固定整百区间。

应允许类似：

- `42456 / 214`；
- `4256 / 214`；
- `424 / 214`；
- 五位数 / 三位数等常见资料分析式子。

量级不同不应被错误地分成不同方法。

### 6.2 三类主要结构

#### A. 整十 / 整百友好基准

例如：

- 424 → 400；
- 478 → 500；
- 755 → 750（如果分子配合计算方便）；
- 692 → 700。

基准选择不是机械“最近的整百”，必须同时考虑分子是否易算。

#### B. 特殊百分数 / 分数友好基准

覆盖常见资料分析友好数，例如但不限于：

- 125；
- 143；
- 167；
- 200；
- 250；
- 333；
- 400；
- 500。

生成时必须让这些基准对当前分子具有真实计算优势，而不是只因为分母靠近它。

#### C. 倍数型

生成明显或半明显的倍数关系，让用户通过放缩快速识别商的附近位置。

倍数应包含资料分析中常见的 2～9 倍结构，但不限制最终商必须是整数。

### 6.3 初始题组比例

V2 初始建议：

- 整十 / 整百：40%；
- 特殊友好基准：35%；
- 倍数型：25%。

后续根据真实训练数据调整，比例必须走结构配额函数，保证不同题量下可确定分配。

### 6.4 r 难度层级

题目应混合：

- 精确易得 r；
- 简单近似 r；
- 适合人为取整档位的 r。

不要回到旧版仅覆盖极小偏差（0～4%）的逻辑。

主要训练范围以约 10% 内放缩为主，生成器需要设置安全上界，并避免“基准虽近但根本不好算”的伪放缩题。

### 6.5 基准候选评分

生成器应先构造候选基准，再按“实战可算性”评分，而不是随机原分母后机械找最近数。

候选评分至少考虑：

- 相对偏差是否在允许范围；
- A / B0 是否能快速口算；
- 是否存在明显倍数；
- 是否命中特殊友好基准；
- 是否会出现多个同样合理、导致过程判定歧义的基准。

若存在多个合理基准，过程诊断不能只接受单一答案；可在题目数据中保存 `acceptableBaselines`。

## 7. 选项生成逻辑

四个选项不能简单围绕精确答案随机扰动。

选项需要承担诊断功能，候选来源可包括：

- 真实值附近；
- 基准结果 Q（未修正）；
- 正确方向一阶结果；
- 错误方向一阶结果；
- 二阶结果；
- 使用常见 r 近似误差后的结果；
- 典型符号错误结果。

但不能每题固定同时出现 Q、R1、R2，否则会反向教会用户通过选项结构猜答案。

题组应混合：

- 一阶即可明显区分的题（多数）；
- 二阶才有必要的题（少数）。

初始可按约 70% / 30% 设计，最终比例在生成器测试中固化。

选项必须：

- 单一正确；
- 间距符合真实资料分析单选题；
- 不因四舍五入出现两个都合理的答案；
- 顺序随机化；
- 保存生成来源标签用于后续复盘。

## 8. 数据模型准备

### 8.1 保留旧历史兼容

现有历史记录仍使用：

- `questionType = special_hundred_scaling_division`；
- `subtype = hundred_scaling`。

旧记录不回写、不重新生成、不重新评分。

V2 是否沿用同一内部 type key 或引入新的 key，在正式实现前根据云同步、历史筛选、导出兼容成本做最终决策。

用户可见名称统一改为「放缩法」。

### 8.2 新题数据建议

每道 V2 题的 `GeneratedQuestion.data` 至少需要保存：

- numerator A；
- denominator B；
- canonical baseline B0；
- acceptable baselines；
- canonical delta；
- true r；
- true r²；
- canonical Q；
- canonical first correction；
- canonical R1；
- canonical second correction；
- canonical R2；
- exact quotient；
- options；
- correct option；
- option source tags；
- scaling structure；
- difficulty / r band；
- generation rule version。

### 8.3 QuestionRecord 扩展方向

放缩法记录应在现有 `QuestionRecord` 基础上增加可选 V2 过程数据，例如：

```ts
scalingProcess?: {
  delta?: ScalingInputState;
  baseline?: ScalingInputState;
  r?: ScalingInputState;
  rSquared?: ScalingInputState;
  baseResult?: ScalingInputState;
  firstCorrection?: ScalingInputState;
  secondCorrection?: ScalingInputState;
  firstResult?: ScalingInputState;
  secondResult?: ScalingInputState;
  optionEvents: Array<{ at: number; option: string }>;
  questionPresentedAt: number;
  submittedAt: number;
  diagnostics?: Record<string, string>;
};
```

字段最终命名在实现时统一，但必须保持可选，保证旧题型和旧历史数据仍能解析。

## 9. Supabase 兼容策略

当前 `completed_training_sessions` 已将完整训练内容保存于 `session_data JSONB`。

V2 第一阶段优先把新增过程事件保存在 session JSON 中，不为每个过程步骤建立独立数据库表，也不立即增加列。

正式编码后需要验证：

1. 本地 completed session 中新增字段不会被 storage 清洗丢失；
2. cloud sync 会完整上传未知/新增嵌套字段；
3. readCloudHistory 可原样恢复；
4. PK 冻结题组不会丢失 V2 题目数据；
5. personal data export 会输出 V2 原始事件。

只有上述链路需要数据库级查询或索引时，才考虑 Supabase migration。

## 10. 与多位数直除的边界

保留现有「多位数直除」。

两者虽然都可能出现 A / B，但训练目标不同：

- 多位数直除：直接估商 / 求商前两位；
- 放缩法：选基准、估偏差、修正、结合选项停止计算。

V2 不与直除合并。

未来可以基于训练数据增加“方法选择训练”，但不属于本阶段范围。

## 11. 开发阶段划分

### Phase 0 — 准备与审计（当前）

- 建立独立开发分支；
- 固化本文档；
- 审计旧放缩生成器；
- 审计训练页输入模型；
- 审计本地 storage → cloud → Supabase → history → export 全链路；
- 明确 V2 type/subtype 兼容方案；
- 不改 production、不改 schema。

### Phase 1 — 生成器与数学核心

- 新建 V2 放缩生成逻辑；
- 删除新题对旧整百配额的依赖；
- 建立三类结构配额；
- 建立候选基准评分；
- 建立一阶/二阶计算工具；
- 建立考试型选项生成器；
- 完成确定性单元测试。

### Phase 2 — 数据类型与事件记录

- 扩展类型；
- 建立 process event 数据结构；
- 支持任意顺序、任意跳过、反复修改；
- 保持旧 session 可读；
- 完成 storage / cloud round-trip 测试。

### Phase 3 — 专属训练 UI

- 实现新版放缩法页面；
- 按确认设计稿布局；
- 使用现有薄荷绿色设计系统；
- 复用底部数字键盘，但增加/确认 `±` 支持；
- 所有辅助框可选；
- 选项提交为唯一完成条件；
- 手机端布局测试。

### Phase 4 — 过程诊断与历史详情

- 计算 attempted / correct / acceptable / wrong；
- 展示用户实际填写过程；
- 不要求固定步骤顺序；
- 可派生字段耗时和回改次数。

### Phase 5 — 云同步与个人数据导出

- 验证 Supabase JSONB 完整保存；
- 导出原始 process events；
- 导出题目结构、选项来源、过程诊断；
- 保持 normal + PK 个人训练统一导出策略。

### Phase 6 — Preview 验证与合并

- `npm test`；
- lint；
- production build；
- Vercel Preview；
- 手机实际界面检查；
- 检查旧历史；
- 检查旧训练题型不回归；
- 经确认后再合并 `master`。

## 12. Phase 0 需要重点审计的现有文件

当前已确认主要涉及：

- `src/lib/types.ts`
  - 题型 key、subtype、GeneratedQuestion、QuestionRecord、TrainingSession；
- `src/lib/generate.ts`
  - 旧整百放缩配额与生成逻辑；
- `src/lib/generate.test.ts`
  - 生成器历史测试；
- `src/app/page.tsx`
  - 当前训练页与提交流程；
- `src/app/globals.css`
  - 项目薄荷绿视觉与训练页布局；
- `src/components/NumberPad.tsx`
  - 数字键盘能力；
- `src/lib/training.ts`
  - 正式提交与 QuestionRecord 生成；
- `src/lib/storage.ts`
  - 本地 active/completed session 兼容；
- `src/lib/cloud.ts`
  - completed session 云同步与读取；
- `src/lib/data-export.ts`
  - 训练记录导出模型；
- `src/lib/data-export-files.ts`
  - CSV/JSON 文件输出；
- `src/components/SessionDetails.tsx`
  - 历史题目详情；
- `supabase/migrations/*`
  - completed session、PK 与同步策略。

## 13. 本阶段明确不做

Phase 0 不做：

- 不改 `master`；
- 不部署 production；
- 不修改 Supabase schema；
- 不删除旧历史；
- 不开始 UI 大规模改写；
- 不把二阶拆成单独训练；
- 不把辅助框改成必填；
- 不预设用户填写顺序；
- 不只保存最终字段值而丢弃编辑事件。

## 14. Phase 0 完成标准

只有以下事项全部完成，才进入正式编码：

1. 旧放缩法生成逻辑定位清楚；
2. V2 与旧历史的 type/subtype 兼容策略确定；
3. 每个输入事件在本地 session 的保存位置确定；
4. storage → cloud → Supabase → history → export 链路确认不会丢字段；
5. NumberPad 的 `±` 行为方案确定；
6. 专属页面与现有 page.tsx 的接入方式确定；
7. 生成器测试矩阵确定；
8. Vercel Preview 路径和回滚方式确定。

完成 Phase 0 审计后，再提交正式实现计划与首批代码修改。