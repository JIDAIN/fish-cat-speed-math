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

  return (
    <>
      <section aria-label="智能训练入口">
        <h3>智能训练</h3>
        <div className="grid trainingTypeGrid">
          <button
            aria-pressed={smartTraining?.mode === "mixed"}
            className={smartTraining?.mode === "mixed" ? "selected" : ""}
            onClick={() =>
              onSelect(
                "skill_drill",
                makeSmartTrainingSubtype("mixed", smartDifficulty),
              )
            }
            type="button"
          >
            混合训练
          </button>
          <button
            aria-pressed={smartTraining?.mode === "path_compare"}
            className={smartTraining?.mode === "path_compare" ? "selected" : ""}
            onClick={() =>
              onSelect(
                "skill_drill",
                makeSmartTrainingSubtype("path_compare", smartDifficulty),
              )
            }
            type="button"
          >
            同题路径对比
          </button>
        </div>
        {smartTraining && (
          <section className="divisionRulePanel" aria-label="智能训练难度">
            <p>难度</p>
            <div className="divisionRuleOptions">
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
          </section>
        )}
      </section>

      <section aria-label="纯计算能力专项入口">
        <h3>纯计算能力专项</h3>
        <SkillDrillSelector
          difficultyBand={skillDifficulty}
          onDifficultyChange={(difficultyBand) => {
            if (!selectedSkillId) return;
            onSelect(
              "skill_drill",
              makeSkillDrillSubtype(selectedSkillId, difficultyBand),
            );
          }}
          onSelectSkill={(skillId) =>
            onSelect(
              "skill_drill",
              makeSkillDrillSubtype(skillId, skillDifficulty),
            )
          }
          selectedSkillId={selectedSkillId}
        />
      </section>

      <h3>已有综合训练</h3>
      <div className="grid trainingTypeGrid">
        {trainingTypeOptions.map((option) => {
          const isSelected =
            option.questionType === type &&
            (option.questionType !== "fraction_percent_conversion" ||
              option.subtype === subtype);

          return (
            <button
              className={isSelected ? "selected" : ""}
              key={option.id}
              onClick={() => onSelect(option.questionType, option.subtype)}
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
    </>
  );
}
