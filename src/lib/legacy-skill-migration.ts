import { getSkillDefinition } from "./skill-registry";
import {
  AnswerValue,
  DifficultyBand,
  GeneratedQuestion,
  SkillId,
  StructuredInputKind,
  TargetPrecision,
} from "./types";

type MigrationSpec = {
  skillId: SkillId;
  secondarySkillIds?: SkillId[];
  inputKind?: StructuredInputKind;
  targetPrecision?: TargetPrecision;
  allowedAnswerSet?: AnswerValue[];
};

function difficultyBandForLegacyLevel(
  level: GeneratedQuestion["difficulty"]["level"],
): DifficultyBand {
  if (level <= 2) return "L1";
  if (level <= 4) return "L2";
  return "L3";
}

function numericData(question: GeneratedQuestion, key: string): number | undefined {
  const value = question.data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function twoDigitSubtractionSkill(question: GeneratedQuestion): SkillId {
  if (question.primaryStructure === "single_carry_or_borrow") return "A-SUB-02";
  if (question.primaryStructure === "boundary_challenge") {
    const a = numericData(question, "a");
    const b = numericData(question, "b");
    if (a !== undefined && b !== undefined && a % 10 < b % 10) return "A-SUB-02";
  }
  return "A-SUB-01";
}

function threeDigitSubtractionSkill(question: GeneratedQuestion): SkillId {
  if (question.primaryStructure === "double_carry_or_borrow") return "A-SUB-03";
  if (question.primaryStructure === "single_carry_or_borrow") return "A-SUB-02";
  return "A-SUB-01";
}

function multiplicationCarryLoad(a: number, b: number) {
  const ones = (a % 10) * (b % 10);
  const cross =
    Math.floor(a / 10) * (b % 10) +
    (a % 10) * Math.floor(b / 10) +
    Math.floor(ones / 10);
  return (ones >= 10 ? 1 : 0) + (cross >= 10 ? 1 : 0) + (cross >= 100 ? 1 : 0);
}

function multiplicationCarrySkill(question: GeneratedQuestion): SkillId {
  const savedLoad = numericData(question, "carryLoad");
  const a = numericData(question, "a");
  const b = numericData(question, "b");
  const load =
    savedLoad ??
    (a !== undefined && b !== undefined ? multiplicationCarryLoad(a, b) : 0);
  if (load <= 0) return "A-MUL-04";
  if (load === 1) return "A-MUL-05";
  if (load === 2) return "A-MUL-06";
  return "A-MUL-07";
}

function migrationSpec(question: GeneratedQuestion): MigrationSpec | undefined {
  if (question.type === "two_digit_add_subtract") {
    return question.data.add === true
      ? { skillId: "A-ADD-01", inputKind: "number", targetPrecision: "exact" }
      : {
          skillId: twoDigitSubtractionSkill(question),
          inputKind: "number",
          targetPrecision: "exact",
        };
  }

  if (question.type === "three_digit_add_subtract") {
    return question.data.add === true
      ? { skillId: "A-ADD-01", inputKind: "number", targetPrecision: "exact" }
      : {
          skillId: threeDigitSubtractionSkill(question),
          inputKind: "number",
          targetPrecision: "exact",
        };
  }

  if (question.type === "two_by_one_multiply") {
    return { skillId: "A-MUL-03", inputKind: "number", targetPrecision: "exact" };
  }

  if (question.type === "two_by_two_multiply") {
    return {
      skillId: "C-MUL-01",
      secondarySkillIds: [multiplicationCarrySkill(question)],
      inputKind: "number",
      targetPrecision: "exact",
    };
  }

  if (question.type === "multi_number_add_subtract") {
    return {
      skillId: "C-ADD-01",
      secondarySkillIds: ["A-ADD-01"],
      inputKind: "number",
      targetPrecision: "exact",
    };
  }

  if (question.type === "fraction_percent_conversion") {
    if (question.subtype === "percent_to_fraction") {
      return {
        skillId: "A-FRA-03",
        inputKind: "number",
        targetPrecision: "exact",
      };
    }
    return {
      skillId: "A-FRA-04",
      secondarySkillIds: [
        numericData(question, "numerator") === 1 ? "A-FRA-01" : "A-FRA-02",
      ],
      inputKind: "number",
      targetPrecision: "exact",
    };
  }

  if (question.type === "fraction_comparison") {
    return {
      skillId: "C-CMP-04",
      inputKind: "choice",
      targetPrecision: "exact",
      allowedAnswerSet: ["<", ">"],
    };
  }

  if (question.type === "three_by_two_division") {
    if (question.subtype === "quotient_first") {
      return { skillId: "C-DIV-11", inputKind: "number", targetPrecision: "exact" };
    }
    if (question.subtype === "quotient_estimate_3_percent") {
      return {
        skillId: "C-DIV-01",
        secondarySkillIds: ["C-DIV-12"],
        inputKind: "number",
        targetPrecision: "3%",
      };
    }
    return { skillId: "C-DIV-12", inputKind: "number", targetPrecision: "exact" };
  }

  if (question.type === "multi_digit_division") {
    const divisorDigits = numericData(question, "divisorDigits");
    return {
      skillId: "C-DIV-12",
      secondarySkillIds: divisorDigits === 3 ? ["C-DIV-03"] : [],
      inputKind: "number",
      targetPrecision: "exact",
    };
  }

  // The old hundred-scaling exercise remains a historical C7 prototype. It is
  // intentionally not assigned a new C-DIVSCALE skill until the unified C7
  // generator and step flow are implemented.
  return undefined;
}

/**
 * Adds schema-v2 capability metadata to questions created by the existing
 * high-coverage generators. Frozen legacy/PK questions are not rewritten;
 * callers decide whether this migration runs at creation time.
 */
export function migrateExistingQuestionToSkillV2(
  question: GeneratedQuestion,
): GeneratedQuestion {
  if (question.skillId) return question;
  const spec = migrationSpec(question);
  if (!spec) return question;

  const definition = getSkillDefinition(spec.skillId);
  const structureTags = Array.from(
    new Set([question.primaryStructure, ...question.secondaryTags].filter(Boolean)),
  );

  return {
    ...question,
    skillId: spec.skillId,
    secondarySkillIds: Array.from(new Set(spec.secondarySkillIds ?? [])),
    difficultyBand: difficultyBandForLegacyLevel(question.difficulty.level),
    structureTags,
    targetPrecision: spec.targetPrecision,
    generatorParams: {
      ...(question.generatorParams ?? {}),
      migrationSource: "existing_generator_v2",
      legacyQuestionType: question.type,
      legacySubtype: question.subtype,
      legacyDifficultyLevel: question.difficulty.level,
      legacyPrimaryStructure: question.primaryStructure,
    },
    allowedAnswerSet: spec.allowedAnswerSet ?? question.allowedAnswerSet,
    masteryProfile: definition.masteryProfile,
    inputKind: spec.inputKind ?? definition.inputKind,
  };
}
