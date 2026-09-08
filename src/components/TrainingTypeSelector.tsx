"use client";

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
