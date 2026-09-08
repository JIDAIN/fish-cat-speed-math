from pathlib import Path

training_selector = r'''"use client";

import { useState } from "react";
import { SkillDrillSelector } from "@/components/SkillDrillSelector";
import { isImplementedSkillId } from "@/lib/implemented-skill-drills";
import {
  makeSkillDrillSubtype,
  makeSmartTrainingSubtype,
  parseSkillDrillSubtype,
  parseSmartTrainingSubtype,
  QuestionType,
  Subtype,
  typeLabels,
} from "@/lib/types";

interface TrainingTypeOption {
  id: string;
  label: string;
  questionType: QuestionType;
  subtype: Subtype;
}

type DivisionSubtype = Extract<
  Subtype,
  "quotient_first" | "quotient_two" | "quotient_estimate_3_percent"
>;
type TwoByTwoSubtype = Extract<Subtype, "standard" | "carry_intensive">;
type SelectorPanel = "special" | "smart" | "classic" | null;

const divisionRuleOptions: readonly {
  label: string;
  value: DivisionSubtype;
}[] = [
  { label: "商首位", value: "quotient_first" },
  { label: "商前两位", value: "quotient_two" },
  { label: "3%估算", value: "quotient_estimate_3_percent" },
];
const twoByTwoModeOptions: readonly {
  label: string;
  value: TwoByTwoSubtype;
}[] = [
  { label: "综合训练", value: "standard" },
  { label: "进位强化", value: "carry_intensive" },
];

const trainingTypeOptions: readonly TrainingTypeOption[] = [
  {
    id: "two_digit_add_subtract",
    label: typeLabels.two_digit_add_subtract,
    questionType: "two_digit_add_subtract",
    subtype: "standard",
  },
  {
    id: "three_digit_add_subtract",
    label: typeLabels.three_digit_add_subtract,
    questionType: "three_digit_add_subtract",
    subtype: "standard",
  },
  {
    id: "two_by_one_multiply",
    label: typeLabels.two_by_one_multiply,
    questionType: "two_by_one_multiply",
    subtype: "standard",
  },
  {
    id: "two_by_two_multiply",
    label: typeLabels.two_by_two_multiply,
    questionType: "two_by_two_multiply",
    subtype: "standard",
  },
  {
    id: "three_by_two_division",
    label: typeLabels.three_by_two_division,
    questionType: "three_by_two_division",
    subtype: "quotient_two",
  },
  {
    id: "multi_digit_division",
    label: typeLabels.multi_digit_division,
    questionType: "multi_digit_division",
    subtype: "quotient_two",
  },
  {
    id: "multi_number_add_subtract",
    label: typeLabels.multi_number_add_subtract,
    questionType: "multi_number_add_subtract",
    subtype: "standard",
  },
  {
    id: "fraction_to_percent",
    label: "分数转百分数",
    questionType: "fraction_percent_conversion",
    subtype: "fraction_to_percent",
  },
  {
    id: "percent_to_fraction",
    label: "百分数转分数",
    questionType: "fraction_percent_conversion",
    subtype: "percent_to_fraction",
  },
  {
    id: "fraction_comparison",
    label: typeLabels.fraction_comparison,
    questionType: "fraction_comparison",
    subtype: "comparison",
  },
  {
    id: "special_hundred_scaling_division",
    label: "整百放缩修正",
    questionType: "special_hundred_scaling_division",
    subtype: "hundred_scaling",
  },
];

interface TrainingTypeSelectorProps {
  type: QuestionType;
  subtype: Subtype;
  onSelect: (type: QuestionType, subtype: Subtype) => void;
  onDivisionRuleChange: (subtype: Subtype) => void;
}

export function TrainingTypeSelector({
  type,
  subtype,
  onSelect,
  onDivisionRuleChange,
}: TrainingTypeSelectorProps) {
  const encodedSkill =
    type === "skill_drill" ? parseSkillDrillSubtype(subtype) : undefined;
  const selectedSkillId = isImplementedSkillId(encodedSkill?.skillId)
    ? encodedSkill.skillId
    : undefined;
  const skillDifficulty = encodedSkill?.difficultyBand ?? "L2";
  const smartTraining =
    type === "skill_drill" ? parseSmartTrainingSubtype(subtype) : undefined;
  const smartDifficulty = smartTraining?.difficultyBand ?? "L2";
  const [panel, setPanel] = useState<SelectorPanel>(null);
  const [dailySelected, setDailySelected] = useState(false);
  const [showSmartDifficulty, setShowSmartDifficulty] = useState(false);

  const togglePanel = (nextPanel: Exclude<SelectorPanel, null>) => {
    setDailySelected(false);
    setShowSmartDifficulty(false);
    setPanel((current) => (current === nextPanel ? null : nextPanel));
  };

  const chooseDaily = () => {
    setPanel(null);
    setDailySelected(true);
    setShowSmartDifficulty(false);
    onSelect("skill_drill", makeSmartTrainingSubtype("mixed", "L2"));
  };

  const chooseSmart = (mode: "mixed" | "path_compare") => {
    setDailySelected(false);
    onSelect("skill_drill", makeSmartTrainingSubtype(mode, smartDifficulty));
  };

  const chooseClassic = (option: TrainingTypeOption) => {
    setDailySelected(false);
    onSelect(option.questionType, option.subtype);
  };

  return (
    <section className="mobileTrainingSelector" aria-label="训练方式">
      <div className="trainingModeGrid">
        <button
          aria-pressed={dailySelected}
          className={`trainingModeCard ${dailySelected ? "selected" : ""}`}
          onClick={chooseDaily}
          type="button"
        >
          <strong>日常训练</strong>
          <small>从已练专项中自动混合 · 默认L2</small>
          <span>至少先完成2个专项</span>
        </button>
        <button
          aria-expanded={panel === "special"}
          className={`trainingModeCard ${panel === "special" ? "selected" : ""}`}
          onClick={() => togglePanel("special")}
          type="button"
        >
          <strong>专项训练</strong>
          <small>明确想练某一块时再展开</small>
          <span>{panel === "special" ? "收起 ↑" : "选择能力 ›"}</span>
        </button>
        <button
          aria-expanded={panel === "smart"}
          className={`trainingModeCard ${panel === "smart" ? "selected" : ""}`}
          onClick={() => togglePanel("smart")}
          type="button"
        >
          <strong>智能训练</strong>
          <small>混合训练与同题路径对比</small>
          <span>{panel === "smart" ? "收起 ↑" : "展开 ›"}</span>
        </button>
        <button
          aria-expanded={panel === "classic"}
          className={`trainingModeCard ${panel === "classic" ? "selected" : ""}`}
          onClick={() => togglePanel("classic")}
          type="button"
        >
          <strong>经典训练</strong>
          <small>保留原来的综合训练入口</small>
          <span>{panel === "classic" ? "收起 ↑" : "展开 ›"}</span>
        </button>
      </div>

      {panel === "special" && (
        <section className="trainingSelectorPanel" aria-label="专项训练选择">
          <div className="selectorPanelHeading">
            <strong>专项训练</strong>
            <small>先选大类，只有需要时才继续展开具体能力</small>
          </div>
          <SkillDrillSelector
            difficultyBand={skillDifficulty}
            onDifficultyChange={(difficultyBand) => {
              if (!selectedSkillId) return;
              onSelect(
                "skill_drill",
                makeSkillDrillSubtype(selectedSkillId, difficultyBand),
              );
            }}
            onSelectSkill={(skillId) => {
              setDailySelected(false);
              onSelect(
                "skill_drill",
                makeSkillDrillSubtype(skillId, skillDifficulty),
              );
            }}
            selectedSkillId={selectedSkillId}
          />
        </section>
      )}

      {panel === "smart" && (
        <section className="trainingSelectorPanel" aria-label="智能训练选择">
          <div className="selectorPanelHeading">
            <strong>智能训练</strong>
            <small>默认L2；只有想主动调整时才展开难度</small>
          </div>
          <div className="smartOptionGrid">
            <button
              aria-pressed={smartTraining?.mode === "mixed"}
              className={smartTraining?.mode === "mixed" ? "selected" : ""}
              onClick={() => chooseSmart("mixed")}
              type="button"
            >
              <strong>混合训练</strong>
              <small>从你已经练过的能力里混合出题</small>
            </button>
            <button
              aria-pressed={smartTraining?.mode === "path_compare"}
              className={smartTraining?.mode === "path_compare" ? "selected" : ""}
              onClick={() => chooseSmart("path_compare")}
              type="button"
            >
              <strong>同题路径对比</strong>
              <small>直除 / 包子法 / 放缩做同一道题</small>
            </button>
          </div>
          {smartTraining && (
            <div className="compactDifficulty">
              <button
                aria-expanded={showSmartDifficulty}
                className="compactDifficultyToggle"
                onClick={() => setShowSmartDifficulty((value) => !value)}
                type="button"
              >
                难度：{smartDifficulty}
                {smartDifficulty === "L2" ? "（默认）" : ""}
                <span>{showSmartDifficulty ? "收起 ↑" : "调整 ›"}</span>
              </button>
              {showSmartDifficulty && (
                <div
                  aria-label="智能训练难度选项"
                  className="divisionRuleOptions compactDifficultyOptions"
                >
                  {(["L1", "L2", "L3"] as const).map((difficultyBand) => (
                    <button
                      aria-pressed={smartDifficulty === difficultyBand}
                      className={smartDifficulty === difficultyBand ? "selected" : ""}
                      key={difficultyBand}
                      onClick={() =>
                        onSelect(
                          "skill_drill",
                          makeSmartTrainingSubtype(
                            smartTraining.mode,
                            difficultyBand,
                          ),
                        )
                      }
                      type="button"
                    >
                      {difficultyBand}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {panel === "classic" && (
        <section className="trainingSelectorPanel" aria-label="经典训练选择">
          <div className="selectorPanelHeading">
            <strong>经典训练</strong>
            <small>旧入口完整保留，但不再占据首页</small>
          </div>
          <div className="grid trainingTypeGrid classicTrainingGrid">
            {trainingTypeOptions.map((option) => {
              const isSelected =
                option.questionType === type &&
                (option.questionType !== "fraction_percent_conversion" ||
                  option.subtype === subtype);
              return (
                <button
                  className={isSelected ? "selected" : ""}
                  key={option.id}
                  onClick={() => chooseClassic(option)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {type === "three_by_two_division" && (
            <section
              className="divisionRulePanel"
              aria-label="三位数除两位数答题要求"
            >
              <p>答题要求</p>
              <div className="divisionRuleOptions">
                {divisionRuleOptions.map((option) => (
                  <button
                    aria-pressed={subtype === option.value}
                    className={subtype === option.value ? "selected" : ""}
                    key={option.value}
                    onClick={() => onDivisionRuleChange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          )}
          {type === "two_by_two_multiply" && (
            <section
              className="divisionRulePanel"
              aria-label="两位数乘两位数训练模式"
            >
              <p>训练模式</p>
              <div className="divisionRuleOptions">
                {twoByTwoModeOptions.map((option) => (
                  <button
                    aria-pressed={subtype === option.value}
                    className={subtype === option.value ? "selected" : ""}
                    key={option.value}
                    onClick={() => onDivisionRuleChange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>
      )}
    </section>
  );
}
'''

skill_selector = r'''"use client";

import { useMemo, useState } from "react";
import { ImplementedSkillId } from "@/lib/implemented-skill-drills";
import { getSkillDefinition } from "@/lib/skill-registry";
import { DifficultyBand } from "@/lib/types";

type SkillDrillGroup = {
  id: string;
  label: string;
  description: string;
  skillIds: readonly ImplementedSkillId[];
};

type SkillSection = {
  id: string;
  label: string;
  description: string;
  groupIds: readonly string[];
};

const groups: readonly SkillDrillGroup[] = [
  {
    id: "a_multiplication_facts",
    label: "乘法口诀 / 进位",
    description: "口诀、两位×一位与连续进位结构",
    skillIds: [
      "A-MUL-01", "A-MUL-02", "A-MUL-03", "A-MUL-04", "A-MUL-05", "A-MUL-06", "A-MUL-07",
    ],
  },
  {
    id: "a_add_sub",
    label: "加减进位 / 借位",
    description: "进位、单借位、连续借位与跨0借位",
    skillIds: ["A-ADD-01", "A-SUB-01", "A-SUB-02", "A-SUB-03", "A-SUB-04", "A-SUB-05"],
  },
  {
    id: "a_complements",
    label: "补数 / 凑整",
    description: "整十、整百、整千与双向凑整",
    skillIds: ["A-COM-01", "A-COM-02", "A-COM-03", "A-COM-04"],
  },
  {
    id: "a_special_multipliers",
    label: "特殊乘数",
    description: "×5、×25、×125、×0.5、×1.5、×2.5",
    skillIds: ["A-SPM-01", "A-SPM-02", "A-SPM-03", "A-SPM-04", "A-SPM-05", "A-SPM-06"],
  },
  {
    id: "a_multiple_sense",
    label: "倍数反应",
    description: "整倍数、十百倍迁移与反向倍数",
    skillIds: ["A-MAG-01", "A-MAG-02", "A-MAG-03"],
  },
  {
    id: "a_percent_blocks",
    label: "基础百分比块",
    description: "0.1%～50% 高频百分比直接反应",
    skillIds: [
      "A-PCT-01", "A-PCT-02", "A-PCT-03", "A-PCT-04", "A-PCT-05", "A-PCT-06",
      "A-PCT-07", "A-PCT-08", "A-PCT-09", "A-PCT-10", "A-PCT-11", "A-PCT-12",
    ],
  },
  {
    id: "a_fixed_fractions",
    label: "固定分数 / 百分数",
    description: "单位分数、常用非单位分数与双向转换",
    skillIds: ["A-FRA-01", "A-FRA-02", "A-FRA-03", "A-FRA-04"],
  },
  {
    id: "a_place_value",
    label: "数位 / 小数点",
    description: "10倍迁移、1%、百分小数互换与量级",
    skillIds: ["A-PLACE-01", "A-PLACE-02", "A-PLACE-03", "A-PLACE-04", "A-PLACE-05", "A-PLACE-06"],
  },
  {
    id: "b_base",
    label: "基准 / 锚点",
    description: "整十百千、百分比块与倒数分数锚点",
    skillIds: ["B-BASE-01", "B-BASE-02", "B-BASE-03", "B-BASE-04", "B-BASE-05"],
  },
  {
    id: "b_order",
    label: "运算顺序",
    description: "凑整重组、乘除顺序、低成本与影响优先级",
    skillIds: ["B-ORDER-01", "B-ORDER-02", "B-ORDER-03", "B-ORDER-04", "B-ORDER-05", "B-ORDER-06", "B-ORDER-07", "B-ORDER-08"],
  },
  {
    id: "b_number_split",
    label: "数字拆分",
    description: "等值凑整拆分与最低成本数字拆法",
    skillIds: ["B-SPLIT-01", "B-SPLIT-02"],
  },
  {
    id: "b_multiplication_split",
    label: "乘法拆分",
    description: "邻近整基准与低成本乘数拆分",
    skillIds: ["B-MSPLIT-01", "B-MSPLIT-02"],
  },
  {
    id: "b_percent_split",
    label: "百分数拆分",
    description: "把复杂百分比拆成低成本基础块",
    skillIds: ["B-PSPLIT-01", "B-PSPLIT-02"],
  },
  {
    id: "b_fraction_percent_split",
    label: "分数拆百分数",
    description: "主块、尾块、反向与最低成本路径",
    skillIds: [
      "B-FPSPLIT-01", "B-FPSPLIT-02", "B-FPSPLIT-03", "B-FPSPLIT-04", "B-FPSPLIT-05",
      "B-FPSPLIT-06", "B-FPSPLIT-07", "B-FPSPLIT-08", "B-FPSPLIT-09", "B-FPSPLIT-10", "B-FPSPLIT-11",
    ],
  },
  {
    id: "b_r",
    label: "求 r",
    description: "差值、基准、符号与1%估 r",
    skillIds: ["B-R-01", "B-R-02", "B-R-03", "B-R-04", "B-R-05", "B-R-06", "B-R-07"],
  },
  {
    id: "b_r_multiply",
    label: "数 × r",
    description: "单一、组合、负 r 与近似修正量",
    skillIds: ["B-RMUL-01", "B-RMUL-02", "B-RMUL-03", "B-RMUL-04", "B-RMUL-05"],
  },
  {
    id: "b_conversion",
    label: "计算转换",
    description: "倒数锚点转换与严格等比例变形",
    skillIds: ["B-CONV-01", "B-CONV-02"],
  },
  {
    id: "b_approximation",
    label: "近似取舍",
    description: "上下取整、有效数字与低成本近似",
    skillIds: ["B-APP-01", "B-APP-02", "B-APP-03", "B-APP-04", "B-APP-05"],
  },
  {
    id: "c_addition",
    label: "加减综合",
    description: "多步加减、高位累计与尾数判断",
    skillIds: ["C-ADD-01", "C-ADD-02", "C-ADD-03"],
  },
  {
    id: "c_full_multiplication",
    label: "完整乘法",
    description: "两位×两位完整计算",
    skillIds: ["C-MUL-01"],
  },
  {
    id: "c_direct_division",
    label: "完整直除 / 步骤",
    description: "完整直除、试商、余量、下一位与停止",
    skillIds: [
      "C-DIV-01", "C-DIV-02", "C-DIV-03", "C-DIV-04", "C-DIV-05", "C-DIV-06", "C-DIV-07",
      "C-DIV-08", "C-DIV-09", "C-DIV-10", "C-DIV-11", "C-DIV-12", "C-DIV-13",
    ],
  },
  {
    id: "c_estimation",
    label: "误差 / 精度",
    description: "误差方向、传播、账本、结论影响与停止",
    skillIds: ["C-EST-01", "C-EST-02", "C-EST-03", "C-EST-04", "C-EST-05", "C-EST-06", "C-EST-07", "C-EST-08", "C-EST-09", "C-EST-10", "C-EST-11"],
  },
  {
    id: "c_division_split",
    label: "除法拆分 / 包子法",
    description: "适用判断、主块、余量、尾量、停止与完整流程",
    skillIds: [
      "C-DIVSPLIT-01", "C-DIVSPLIT-02", "C-DIVSPLIT-03", "C-DIVSPLIT-04", "C-DIVSPLIT-05", "C-DIVSPLIT-06",
      "C-DIVSPLIT-07", "C-DIVSPLIT-08", "C-DIVSPLIT-09", "C-DIVSPLIT-10", "C-DIVSPLIT-11",
    ],
  },
  {
    id: "c_xp_scale",
    label: "加减乘补偿放缩",
    description: "加法互补、减法同向与乘法反向补偿",
    skillIds: ["C-XP-SCALE-01", "C-XP-SCALE-02", "C-XP-SCALE-03"],
  },
  {
    id: "c_division_scale",
    label: "除法补偿放缩",
    description: "明显倍数、选基准、修分子/结果、一阶与二阶",
    skillIds: [
      "C-DIVSCALE-01", "C-DIVSCALE-02", "C-DIVSCALE-03", "C-DIVSCALE-04", "C-DIVSCALE-05",
      "C-DIVSCALE-06", "C-DIVSCALE-07", "C-DIVSCALE-08", "C-DIVSCALE-09", "C-DIVSCALE-10",
      "C-DIVSCALE-11", "C-DIVSCALE-12", "C-DIVSCALE-13", "C-DIVSCALE-14", "C-DIVSCALE-15",
    ],
  },
  {
    id: "c_comparison",
    label: "纯数值比较",
    description: "整数、小数百分数、分数、基准与阈值比较",
    skillIds: ["C-CMP-01", "C-CMP-02", "C-CMP-03", "C-CMP-04", "C-CMP-05", "C-CMP-06"],
  },
];

const sections: readonly SkillSection[] = [
  {
    id: "basic",
    label: "基础口算",
    description: "口诀、进借位、特殊乘法与完整乘法",
    groupIds: ["a_multiplication_facts", "a_add_sub", "a_complements", "a_special_multipliers", "a_multiple_sense", "c_full_multiplication"],
  },
  {
    id: "fraction_percent",
    label: "百分比 / 分数",
    description: "固定关系、百分比块与拆分",
    groupIds: ["a_percent_blocks", "a_fixed_fractions", "b_percent_split", "b_fraction_percent_split"],
  },
  {
    id: "anchor",
    label: "数位 / 基准",
    description: "数位、小数点、基准与等比例转换",
    groupIds: ["a_place_value", "b_base", "b_conversion"],
  },
  {
    id: "transform",
    label: "顺序 / 拆分 / 近似",
    description: "低成本重组、拆数与近似取舍",
    groupIds: ["b_order", "b_number_split", "b_multiplication_split", "b_approximation"],
  },
  {
    id: "correction",
    label: "r 与修正量",
    description: "求 r 与数×r",
    groupIds: ["b_r", "b_r_multiply"],
  },
  {
    id: "direct_division",
    label: "直除",
    description: "完整直除与各步骤专项",
    groupIds: ["c_direct_division"],
  },
  {
    id: "bun",
    label: "包子法",
    description: "除法拆分完整路径",
    groupIds: ["c_division_split"],
  },
  {
    id: "scale",
    label: "补偿放缩",
    description: "加减乘补偿与除法补偿放缩",
    groupIds: ["c_xp_scale", "c_division_scale"],
  },
  {
    id: "error_compare",
    label: "误差 / 比较",
    description: "误差精度、加减综合与数值比较",
    groupIds: ["c_addition", "c_estimation", "c_comparison"],
  },
];

export const skillDrillSelectorSkillIds = groups.flatMap((group) => group.skillIds);

const difficultyOptions: readonly DifficultyBand[] = ["L1", "L2", "L3"];

function groupForSkill(skillId?: ImplementedSkillId) {
  return groups.find((group) => skillId && group.skillIds.includes(skillId));
}

function sectionForGroup(group?: SkillDrillGroup) {
  return sections.find((section) => group && section.groupIds.includes(group.id));
}

type SkillDrillSelectorProps = {
  selectedSkillId?: ImplementedSkillId;
  difficultyBand: DifficultyBand;
  onSelectSkill: (skillId: ImplementedSkillId) => void;
  onDifficultyChange: (difficultyBand: DifficultyBand) => void;
};

export function SkillDrillSelector({
  selectedSkillId,
  difficultyBand,
  onSelectSkill,
  onDifficultyChange,
}: SkillDrillSelectorProps) {
  const selectedGroup = groupForSkill(selectedSkillId);
  const selectedSection = sectionForGroup(selectedGroup);
  const [sectionId, setSectionId] = useState<string | undefined>(selectedSection?.id);
  const [groupId, setGroupId] = useState<string | undefined>(selectedGroup?.id);
  const [showDifficulty, setShowDifficulty] = useState(false);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === sectionId),
    [sectionId],
  );
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groupId],
  );
  const sectionGroups = useMemo(
    () => groups.filter((group) => activeSection?.groupIds.includes(group.id)),
    [activeSection],
  );

  const chooseSection = (next: SkillSection) => {
    const isClosing = next.id === sectionId;
    if (isClosing) {
      setSectionId(undefined);
      setGroupId(undefined);
      return;
    }
    setSectionId(next.id);
    setShowDifficulty(false);
    setGroupId(next.groupIds.length === 1 ? next.groupIds[0] : undefined);
  };

  return (
    <section aria-label="纯计算能力专项">
      <div className="skillSectionGrid" aria-label="专项大类">
        {sections.map((section) => (
          <button
            aria-expanded={sectionId === section.id}
            className={`skillSectionCard ${sectionId === section.id ? "selected" : ""}`}
            key={section.id}
            onClick={() => chooseSection(section)}
            type="button"
          >
            <strong>{section.label}</strong>
            <small>{section.description}</small>
          </button>
        ))}
      </div>

      {activeSection && sectionGroups.length > 1 && (
        <div className="skillSubgroupGrid" aria-label={`${activeSection.label}细分`}>
          {sectionGroups.map((group) => (
            <button
              aria-pressed={activeGroup?.id === group.id}
              className={activeGroup?.id === group.id ? "selected" : ""}
              key={group.id}
              onClick={() => {
                setGroupId(group.id);
                setShowDifficulty(false);
              }}
              type="button"
            >
              <strong>{group.label}</strong>
              <small>{group.description}</small>
            </button>
          ))}
        </div>
      )}

      {activeGroup && (
        <section className="skillLeafPanel" aria-label={`${activeGroup.label}具体能力`}>
          <div className="skillLeafHeading">
            <strong>{activeGroup.label}</strong>
            <small>只在这里选择你现在明确想练的具体能力</small>
          </div>
          <div className="skillLeafGrid">
            {activeGroup.skillIds.map((skillId) => (
              <button
                aria-pressed={selectedSkillId === skillId}
                className={selectedSkillId === skillId ? "selected" : ""}
                key={skillId}
                onClick={() => onSelectSkill(skillId)}
                type="button"
              >
                {getSkillDefinition(skillId).displayName}
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedSkillId && (
        <div className="compactDifficulty">
          <button
            aria-expanded={showDifficulty}
            className="compactDifficultyToggle"
            onClick={() => setShowDifficulty((value) => !value)}
            type="button"
          >
            难度：{difficultyBand}
            {difficultyBand === "L2" ? "（默认）" : ""}
            <span>{showDifficulty ? "收起 ↑" : "调整 ›"}</span>
          </button>
          {showDifficulty && (
            <div aria-label="专项难度选项" className="divisionRuleOptions compactDifficultyOptions">
              {difficultyOptions.map((difficulty) => (
                <button
                  aria-pressed={difficultyBand === difficulty}
                  className={difficultyBand === difficulty ? "selected" : ""}
                  key={difficulty}
                  onClick={() => onDifficultyChange(difficulty)}
                  type="button"
                >
                  {difficulty}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
'''

selector_test = r'''import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrainingTypeSelector } from "./TrainingTypeSelector";
import { skillDrillSelectorSkillIds } from "./SkillDrillSelector";
import { implementedSkillIds } from "@/lib/implemented-skill-drills";
import { QuestionType, Subtype } from "@/lib/types";

afterEach(cleanup);

function StatefulSelector() {
  const [type, setType] = useState<QuestionType>("two_digit_add_subtract");
  const [subtype, setSubtype] = useState<Subtype>("standard");
  return (
    <TrainingTypeSelector
      onDivisionRuleChange={setSubtype}
      onSelect={(nextType, nextSubtype) => {
        setType(nextType);
        setSubtype(nextSubtype);
      }}
      subtype={subtype}
      type={type}
    />
  );
}

describe("TrainingTypeSelector mobile information architecture", () => {
  it("shows only four top-level training choices before details are expanded", () => {
    render(<StatefulSelector />);

    expect(screen.getByRole("button", { name: /日常训练/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /专项训练/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /智能训练/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /经典训练/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "两位数加减" })).toBeNull();
    expect(screen.queryByRole("button", { name: /误差 \/ 精度/ })).toBeNull();
  });

  it("keeps all 160 leaf skills reachable behind the specialty hierarchy", () => {
    expect(skillDrillSelectorSkillIds).toHaveLength(160);
    expect(new Set(skillDrillSelectorSkillIds).size).toBe(160);
    expect([...skillDrillSelectorSkillIds].sort()).toEqual(
      [...implementedSkillIds].sort(),
    );

    render(<StatefulSelector />);
    fireEvent.click(screen.getByRole("button", { name: /专项训练/ }));
    expect(screen.getByRole("button", { name: /基础口算/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /百分比 \/ 分数/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^直除/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^包子法/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^补偿放缩/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /误差 \/ 比较/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /误差 \/ 比较/ }));
    fireEvent.click(screen.getByRole("button", { name: /误差 \/ 精度/ }));
    fireEvent.click(screen.getByRole("button", { name: "精度停止" }));
    expect(
      screen.getByRole("button", { name: /难度：L2/ }).getAttribute("aria-expanded"),
    ).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /难度：L2/ }));
    fireEvent.click(screen.getByLabelText("专项难度选项").querySelectorAll("button")[2]);
    expect(screen.getByRole("button", { name: /难度：L3/ })).toBeTruthy();
  });

  it("makes daily training a one-tap L2 mixed-training shortcut", () => {
    const onSelect = vi.fn();
    render(
      <TrainingTypeSelector
        onDivisionRuleChange={vi.fn()}
        onSelect={onSelect}
        subtype="standard"
        type="two_digit_add_subtract"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /日常训练/ }));
    expect(onSelect).toHaveBeenLastCalledWith("skill_drill", "mixed:L2");
  });

  it("keeps smart modes compact and only expands difficulty on demand", () => {
    render(<StatefulSelector />);
    fireEvent.click(screen.getByRole("button", { name: /智能训练/ }));
    fireEvent.click(screen.getByRole("button", { name: /^同题路径对比/ }));
    expect(screen.getByRole("button", { name: /难度：L2/ })).toBeTruthy();
    expect(screen.queryByLabelText("智能训练难度选项")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /难度：L2/ }));
    const options = screen.getByLabelText("智能训练难度选项");
    fireEvent.click(options.querySelectorAll("button")[2]);
    expect(screen.getByRole("button", { name: /难度：L3/ })).toBeTruthy();
  });

  it("keeps legacy comprehensive training behind the classic entry", () => {
    render(<StatefulSelector />);
    fireEvent.click(screen.getByRole("button", { name: /经典训练/ }));
    fireEvent.click(screen.getByRole("button", { name: "三位数÷两位数" }));
    expect(screen.getByLabelText("三位数除两位数答题要求")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "3%估算" }));
    expect(
      screen.getByRole("button", { name: "3%估算" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "两位数×两位数" }));
    expect(screen.getByLabelText("两位数乘两位数训练模式")).toBeTruthy();
  });
});
'''

Path("src/components/TrainingTypeSelector.tsx").write_text(training_selector)
Path("src/components/SkillDrillSelector.tsx").write_text(skill_selector)
Path("src/components/TrainingTypeSelector.test.tsx").write_text(selector_test)

page_test_path = Path("src/app/page.test.tsx")
page_test = page_test_path.read_text()
page_test = page_test.replace(
    '    render(<Home />);\n    fireEvent.click(screen.getByRole("button", { name: "三位数÷两位数" }));',
    '    render(<Home />);\n    fireEvent.click(screen.getByRole("button", { name: /经典训练/ }));\n    fireEvent.click(screen.getByRole("button", { name: "三位数÷两位数" }));',
)
page_test = page_test.replace(
    '    render(<Home />);\n    fireEvent.click(screen.getByRole("button", { name: "百分数转分数" }));',
    '    render(<Home />);\n    fireEvent.click(screen.getByRole("button", { name: /经典训练/ }));\n    fireEvent.click(screen.getByRole("button", { name: "百分数转分数" }));',
)
page_test = page_test.replace(
    '    const { container } = render(<Home />);\n    fireEvent.click(screen.getByRole("button", { name: "百分数转分数" }));',
    '    const { container } = render(<Home />);\n    fireEvent.click(screen.getByRole("button", { name: /经典训练/ }));\n    fireEvent.click(screen.getByRole("button", { name: "百分数转分数" }));',
)
page_test_path.write_text(page_test)

css_path = Path("src/app/globals.css")
css = css_path.read_text()
marker = '''.divisionRuleOptions button.selected {\n  border-color: #8fc9aa;\n  outline: 0;\n}\n'''
assert marker in css, "mobile selector CSS marker missing"
mobile_css = r'''

/* Mobile-first training entry hierarchy: keep the 160-skill tree out of the home scroll. */
.mobileTrainingSelector {
  display: grid;
  gap: 12px;
}
.trainingModeGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.trainingModeCard {
  display: flex;
  min-height: 106px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 5px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgb(228 244 236 / 76%);
  text-align: left;
}
.trainingModeCard strong {
  font-size: 18px;
}
.trainingModeCard small {
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
}
.trainingModeCard span {
  margin-top: auto;
  color: var(--green-700);
  font-size: 12px;
  font-weight: 700;
}
.trainingSelectorPanel {
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgb(255 255 255 / 68%);
}
.selectorPanelHeading,
.skillLeafHeading {
  display: grid;
  gap: 3px;
  margin-bottom: 11px;
}
.selectorPanelHeading strong,
.skillLeafHeading strong {
  font-size: 16px;
}
.selectorPanelHeading small,
.skillLeafHeading small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}
.skillSectionGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.skillSectionCard {
  display: grid;
  min-height: 78px;
  align-content: center;
  gap: 4px;
  padding: 10px 11px;
  border: 1px solid transparent;
  text-align: left;
}
.skillSectionCard strong {
  font-size: 15px;
}
.skillSectionCard small {
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
}
.skillSubgroupGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.skillSubgroupGrid button {
  display: grid;
  min-height: 64px;
  gap: 3px;
  padding: 9px 10px;
  text-align: left;
}
.skillSubgroupGrid strong {
  font-size: 14px;
}
.skillSubgroupGrid small {
  color: var(--muted);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.35;
}
.skillLeafPanel {
  margin-top: 10px;
  padding-top: 11px;
  border-top: 1px solid var(--line);
}
.skillLeafGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.skillLeafGrid button {
  min-height: 52px;
  padding: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  line-height: 1.35;
}
.smartOptionGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.smartOptionGrid button {
  display: grid;
  min-height: 78px;
  gap: 4px;
  padding: 11px;
  text-align: left;
}
.smartOptionGrid button strong {
  font-size: 15px;
}
.smartOptionGrid button small {
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
}
.compactDifficulty {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}
.compactDifficultyToggle {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--line);
  background: rgb(255 255 255 / 82%);
  font-size: 13px;
  text-align: left;
}
.compactDifficultyToggle span {
  color: var(--green-700);
  font-size: 12px;
}
.compactDifficultyOptions {
  padding: 0 2px 2px;
}
.classicTrainingGrid button {
  min-height: 58px;
}

@media (max-width: 390px) {
  .trainingModeCard {
    min-height: 98px;
    padding: 12px;
  }
  .trainingModeCard strong {
    font-size: 17px;
  }
  .skillSectionGrid,
  .skillSubgroupGrid,
  .skillLeafGrid,
  .smartOptionGrid {
    gap: 7px;
  }
}
'''
if "Mobile-first training entry hierarchy" not in css:
    css = css.replace(marker, marker + mobile_css, 1)
css_path.write_text(css)
