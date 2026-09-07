import {
  MasteryProfile,
  SkillId,
  StructuredInputKind,
} from "./types";

export type SkillLayer = "A" | "B" | "C";

export interface SkillDefinition {
  id: SkillId;
  displayName: string;
  layer: SkillLayer;
  group: string;
  masteryProfile: MasteryProfile;
  inputKind: StructuredInputKind;
  generatorKey: string;
  diagnosticTargets: SkillId[];
  implementationStatus: "planned" | "migrating" | "implemented";
}

type GroupSeed = {
  prefix: string;
  layer: SkillLayer;
  group: string;
  names: readonly string[];
  mastery: MasteryProfile | readonly MasteryProfile[];
  inputKind: StructuredInputKind;
  diagnosticTargets?: readonly SkillId[];
};

const profiles = (
  value: MasteryProfile | readonly MasteryProfile[],
  count: number,
): readonly MasteryProfile[] =>
  Array.isArray(value) ? value : Array.from({ length: count }, () => value);

const group = ({
  prefix,
  layer,
  group,
  names,
  mastery,
  inputKind,
  diagnosticTargets = [],
}: GroupSeed): SkillDefinition[] => {
  const masteryProfiles = profiles(mastery, names.length);
  if (masteryProfiles.length !== names.length)
    throw new Error(`Skill registry mastery mismatch for ${prefix}`);
  return names.map((displayName, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, "0")}` as SkillId,
    displayName,
    layer,
    group,
    masteryProfile: masteryProfiles[index],
    inputKind,
    generatorKey: prefix.toLowerCase().replaceAll("-", "_"),
    diagnosticTargets: [...diagnosticTargets],
    implementationStatus: "planned",
  }));
};

const definitions: SkillDefinition[] = [
  ...group({
    prefix: "A-MUL",
    layer: "A",
    group: "乘法口诀与乘法结构",
    names: [
      "正向乘法口诀",
      "逆向乘法口诀",
      "两位数×一位数",
      "两位数×两位数无复杂进位",
      "个位乘积进位",
      "中间累加进位",
      "多次连续进位",
    ],
    mastery: ["R", "R", "C", "C", "C", "C", "C"],
    inputKind: "number",
  }),
  ...group({
    prefix: "A-ADD",
    layer: "A",
    group: "基础加法",
    names: ["多位数加法"],
    mastery: "C",
    inputKind: "number",
  }),
  ...group({
    prefix: "A-SUB",
    layer: "A",
    group: "基础减法与借位",
    names: ["普通多位数减法", "单次借位", "连续借位", "跨0借位", "多位连续变化"],
    mastery: "C",
    inputKind: "number",
  }),
  ...group({
    prefix: "A-COM",
    layer: "A",
    group: "补数与凑整",
    names: ["到整十补数", "到整百补数", "到整千补数", "双向凑整"],
    mastery: ["R", "R", "R", "D"],
    inputKind: "number",
  }),
  ...group({
    prefix: "A-SPM",
    layer: "A",
    group: "特殊乘数",
    names: ["×5", "×25", "×125", "×0.5", "×1.5", "×2.5"],
    mastery: "R",
    inputKind: "number",
  }),
  ...group({
    prefix: "A-MAG",
    layer: "A",
    group: "乘除倍数反应",
    names: ["整倍数反应", "十倍与百倍迁移", "反向倍数判断"],
    mastery: "R",
    inputKind: "number",
  }),
  ...group({
    prefix: "A-FRA",
    layer: "A",
    group: "分数百分数自动化",
    names: ["高频单位分数互换", "高频非单位分数互换", "百分数转附近高频分数", "分数转百分数快速反应"],
    mastery: "R",
    inputKind: "number",
  }),
  ...group({
    prefix: "A-PCT",
    layer: "A",
    group: "基础百分比倍数",
    names: [
      "求0.1%",
      "求1%",
      "求2%",
      "求2.5%",
      "求3%",
      "求5%",
      "求10%",
      "求12.5%",
      "求20%",
      "求25%",
      "求33.3%",
      "求50%",
    ],
    mastery: "R",
    inputKind: "number",
  }),
  ...group({
    prefix: "A-PLACE",
    layer: "A",
    group: "数位小数点与量级",
    names: ["乘10/100/1000", "除10/100/1000", "求1%", "百分数与小数双向转换", "量级判断", "小数点迁移"],
    mastery: "R",
    inputKind: "number",
  }),
  ...group({
    prefix: "B-BASE",
    layer: "B",
    group: "基准与锚点",
    names: ["整十基准", "整百基准", "整千基准", "百分比块基准", "倒数与分数锚点"],
    mastery: "D",
    inputKind: "choice",
  }),
  ...group({
    prefix: "B-ORDER",
    layer: "B",
    group: "运算顺序与重组",
    names: ["加法凑整顺序", "减法重组", "乘法重组", "连续除法顺序", "乘除混合重组", "最低操作成本顺序", "影响大的先算", "小影响暂缓"],
    mastery: "D",
    inputKind: "sequence",
  }),
  ...group({
    prefix: "B-SPLIT",
    layer: "B",
    group: "数字拆分",
    names: ["数字等值拆分", "最低成本数字拆分"],
    mastery: "D",
    inputKind: "choice",
  }),
  ...group({
    prefix: "B-MSPLIT",
    layer: "B",
    group: "乘法拆分",
    names: ["邻近整基准乘法拆分", "乘数拆分"],
    mastery: "D",
    inputKind: "choice",
  }),
  ...group({
    prefix: "B-PSPLIT",
    layer: "B",
    group: "百分数拆分",
    names: ["百分数块拆分", "最低成本百分数拆分"],
    mastery: "D",
    inputKind: "percent_blocks",
  }),
  ...group({
    prefix: "B-FPSPLIT",
    layer: "B",
    group: "分数拆百分数组件",
    names: ["100%主块", "50%主块", "25%主块", "20%主块", "10%主块", "5%主块", "1%尾块", "0.1%尾块", "多段拆分", "反向包子法", "最低成本拆分路径"],
    mastery: "D",
    inputKind: "percent_blocks",
  }),
  ...group({
    prefix: "B-R",
    layer: "B",
    group: "r感知与求r",
    names: ["求差值", "选择基准分母", "差值÷基准", "分数转百分数", "r符号判断", "r粗略化", "用1%估r"],
    mastery: ["C", "D", "C", "C", "D", "D", "C"],
    inputKind: "number",
  }),
  ...group({
    prefix: "B-RMUL",
    layer: "B",
    group: "某个数×r",
    names: ["单一百分比块×r", "组合百分比×r", "两位百分数×r", "负r修正量", "近似n×r"],
    mastery: "C",
    inputKind: "number",
  }),
  ...group({
    prefix: "B-CONV",
    layer: "B",
    group: "计算转换",
    names: ["倒数锚点转换", "等值比例变形"],
    mastery: "D",
    inputKind: "choice",
  }),
  ...group({
    prefix: "B-APP",
    layer: "B",
    group: "数值近似与取舍",
    names: ["四舍五入", "主动向上近似", "主动向下近似", "保留有效数字", "最低成本近似"],
    mastery: "D",
    inputKind: "choice",
  }),
  ...group({
    prefix: "C-ADD",
    layer: "C",
    group: "加减综合",
    names: ["多步加减", "高位累计", "尾数判断"],
    mastery: "S",
    inputKind: "number",
  }),
  ...group({
    prefix: "C-MUL",
    layer: "C",
    group: "乘法综合",
    names: ["两位数×两位数完整计算"],
    mastery: "S",
    inputKind: "number",
  }),
  ...group({
    prefix: "C-DIV",
    layer: "C",
    group: "直除",
    names: ["三位数÷两位数", "四位数÷两位数", "五位数÷三位数", "完整直除流程", "商区间判断", "试商", "试商过高回退", "试商过低上调", "求余量", "下一位衔接", "求商首位", "求商前两位", "直除精度停止"],
    mastery: ["F", "F", "F", "F", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
    inputKind: "steps",
  }),
  ...group({
    prefix: "C-EST",
    layer: "C",
    group: "估算误差与精度控制",
    names: ["量级与区间", "单项近似方向", "误差档判断", "加法误差累计与抵消", "减法误差累计与抵消", "乘法误差传播", "除法误差传播", "多误差合成", "误差账本", "误差是否影响结论", "精度停止"],
    mastery: "D",
    inputKind: "choice",
  }),
  ...group({
    prefix: "C-DIVSPLIT",
    layer: "C",
    group: "除法拆分法",
    names: ["拆分适用判断", "第一主块选择", "主块计算", "剩余量计算", "下一块选择", "尾量处理", "累计百分比", "反向拆分", "继续或退出", "拆分精度停止", "完整拆分流程"],
    mastery: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S", "F"],
    inputKind: "steps",
  }),
  ...group({
    prefix: "C-XP-SCALE",
    layer: "C",
    group: "加减乘补偿性放缩",
    names: ["加法补偿", "减法同向补偿", "乘法反向补偿"],
    mastery: "S",
    inputKind: "steps",
  }),
  ...group({
    prefix: "C-DIVSCALE",
    layer: "C",
    group: "除法补偿放缩",
    names: ["明显倍数扫描", "分母基准选择", "基准值得性判断", "补偿位置选择", "分子调整方向", "分子调整量", "好算新分子选择", "新分子÷基准", "结果端r", "基准商Q0", "一阶修正量", "一阶结果", "二阶必要性判断", "二阶修正", "明显倍数线性修正"],
    mastery: ["D", "D", "D", "D", "D", "S", "D", "S", "S", "S", "S", "S", "D", "S", "S"],
    inputKind: "steps",
  }),
  ...group({
    prefix: "C-CMP",
    layer: "C",
    group: "纯数值比较",
    names: ["整数比较", "小数与百分数比较", "分数与百分数比较", "两个分数比较", "与基准比较", "阈值比较"],
    mastery: "D",
    inputKind: "choice",
  }),
];

export const PURE_COMPUTATION_SKILL_COUNT = 160;

if (definitions.length !== PURE_COMPUTATION_SKILL_COUNT)
  throw new Error(
    `Expected ${PURE_COMPUTATION_SKILL_COUNT} pure-computation skills, got ${definitions.length}`,
  );

export const skillRegistry = Object.freeze(
  Object.fromEntries(definitions.map((definition) => [definition.id, definition])),
) as Readonly<Record<SkillId, SkillDefinition>>;

export const skillDefinitions = Object.freeze(definitions);

export function isRegisteredSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && value in skillRegistry;
}

export function getSkillDefinition(skillId: SkillId): SkillDefinition {
  const definition = skillRegistry[skillId];
  if (!definition) throw new Error(`Unknown skill id: ${skillId}`);
  return definition;
}

export function skillsForLayer(layer: SkillLayer): SkillDefinition[] {
  return skillDefinitions.filter((definition) => definition.layer === layer);
}
