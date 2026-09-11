"use client";

import { useState } from "react";
import { SkillDrillSelector } from "@/components/SkillDrillSelector";
import { isImplementedSkillId } from "@/lib/implemented-skill-drills";
import {
  makeSkillDrillSubtype,
  makeSmartTrainingSubtype,
  parseSkillDrillSubtype,
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
type SelectorPanel = "special" | "classic" | null;

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
  { id: "two_digit_add_subtract", label: typeLabels.two_digit_add_subtract, questionType: "two_digit_add_subtract", subtype: "standard" },
  { id: "three_digit_add_subtract", label: typeLabels.three_digit_add_subtract, questionType: "three_digit_add_subtract", subtype: "standard" },
  { id: "two_by_one_multiply", label: typeLabels.two_by_one_multiply, questionType: "two_by_one_multiply", subtype: "standard" },
  { id: "two_by_two_multiply", label: typeLabels.two_by_two_multiply, questionType: "two_by_two_multiply", subtype: "standard" },
  { id: "three_by_two_division", label: typeLabels.three_by_two_division, questionType: "three_by_two_division", subtype: "quotient_two" },
  { id: "multi_digit_division", label: typeLabels.multi_digit_division, questionType: "multi_digit_division", subtype: "quotient_two" },
  { id: "multi_number_add_subtract", label: typeLabels.multi_number_add_subtract, questionType: "multi_number_add_subtract", subtype: "standard" },
  { id: "fraction_to_percent", label: "分数转百分数", questionType: "fraction_percent_conversion", subtype: "fraction_to_percent" },
  { id: "percent_to_fraction", label: "百分数转分数", questionType: "fraction_percent_conversion", subtype: "percent_to_fraction" },
  { id: "fraction_comparison", label: typeLabels.fraction_comparison, questionType: "fraction_comparison", subtype: "comparison" },
  { id: "special_hundred_scaling_division", label: "整百放缩修正", questionType: "special_hundred_scaling_division", subtype: "hundred_scaling" },
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
  const [panel, setPanel] = useState<SelectorPanel>(null);
  const [dailySelected, setDailySelected] = useState(false);

  const togglePanel = (nextPanel: Exclude<SelectorPanel, null>) => {
    setDailySelected(false);
    setPanel((current) => (current === nextPanel ? null : nextPanel));
  };

  const chooseDaily = () => {
    setPanel(null);
    setDailySelected(true);
    onSelect("skill_drill", makeSmartTrainingSubtype("mixed", "L2"));
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
          <small>从已练A专项中自动混合 · 默认L2</small>
          <span>至少先完成2个专项</span>
        </button>
        <button
          aria-expanded={panel === "special"}
          className={`trainingModeCard ${panel === "special" ? "selected" : ""}`}
          onClick={() => togglePanel("special")}
          type="button"
        >
          <strong>专项训练</strong>
          <small>8个A层正式能力</small>
          <span>{panel === "special" ? "收起 ↑" : "选择能力 ›"}</span>
        </button>
        <button
          aria-expanded={panel === "classic"}
          className={`trainingModeCard ${panel === "classic" ? "selected" : ""}`}
          onClick={() => togglePanel("classic")}
          type="button"
        >
          <strong>经典训练</strong>
          <small>原有训练与真实历史继续保留</small>
          <span>{panel === "classic" ? "收起 ↑" : "展开 ›"}</span>
        </button>
      </div>

      {panel === "special" && (
        <section className="trainingSelectorPanel" aria-label="专项训练选择">
          <div className="selectorPanelHeading">
            <strong>专项训练</strong>
            <small>C层入口位置保留，方法设计完成前不可选</small>
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

      {panel === "classic" && (
        <section className="trainingSelectorPanel" aria-label="经典训练选择">
          <div className="selectorPanelHeading">
            <strong>经典训练</strong>
            <small>保持原题型、记录和PK语义，不映射到新A能力</small>
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
            <section className="divisionRulePanel" aria-label="三位数除两位数答题要求">
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
            <section className="divisionRulePanel" aria-label="两位数乘两位数训练模式">
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
