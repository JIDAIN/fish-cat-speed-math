import { QuestionType, Subtype, typeLabels } from "@/lib/types";

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

const divisionRuleOptions: readonly {
  label: string;
  value: DivisionSubtype;
}[] = [
  { label: "商首位", value: "quotient_first" },
  { label: "商前两位", value: "quotient_two" },
  { label: "3%估算", value: "quotient_estimate_3_percent" },
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
  return (
    <>
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
    </>
  );
}
