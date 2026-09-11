"use client";

import { useMemo, useState } from "react";
import { ImplementedSkillId } from "@/lib/implemented-skill-drills";
import { DifficultyBand } from "@/lib/types";

type StudentCategory = {
  id: string;
  label: string;
  description: string;
  skillIds: readonly ImplementedSkillId[];
  disabled?: boolean;
};

const abilityLabels: Partial<Record<ImplementedSkillId, string>> = {
  "A-ADD-01": "2～3位加法",
  "A-SUB-01": "2～3位减法",
  "A-COM-01": "近邻小差值",
  "A-MUL-01": "正向乘法口诀",
  "A-MUL-02": "逆向乘法口诀",
  "A-MUL-03": "两位数×一位数",
  "A-FRA-01": "高频分数 ↔ 百分数",
  "A-PCT-01": "基础百分比取值",
};

/**
 * The six student-facing first-layer categories remain stable. This release
 * only exposes the eight canonical A abilities that have been re-audited.
 * C/method entries stay out of the selector until their product design is done.
 */
const categories: readonly StudentCategory[] = [
  {
    id: "near_multiple",
    label: "邻近倍数反应",
    description: "后续与除法方法一起收口",
    skillIds: [],
    disabled: true,
  },
  {
    id: "fraction_percent",
    label: "百化分反应",
    description: "固定高频分数与百分数双向反应",
    skillIds: ["A-FRA-01"],
  },
  {
    id: "add_subtract",
    label: "加减法",
    description: "基础加减与近邻差值",
    skillIds: ["A-ADD-01", "A-SUB-01", "A-COM-01"],
  },
  {
    id: "multiplication",
    label: "乘法",
    description: "口诀、两位×一位与百分比取值",
    skillIds: ["A-MUL-01", "A-MUL-02", "A-MUL-03", "A-PCT-01"],
  },
  {
    id: "division",
    label: "除法",
    description: "C层方法设计完成后接入",
    skillIds: [],
    disabled: true,
  },
  {
    id: "fraction_comparison",
    label: "分数比较",
    description: "C层设计完成后接入",
    skillIds: [],
    disabled: true,
  },
];

export const skillDrillSelectorSkillIds = categories.flatMap(
  (category) => category.skillIds,
);

const difficultyOptions: readonly {
  value: DifficultyBand;
  label: string;
  description: string;
}[] = [
  { value: "L1", label: "L1", description: "友好结构 / 基础反应" },
  { value: "L2", label: "L2", description: "标准训练" },
  { value: "L3", label: "L3", description: "同能力内的高负荷结构" },
];

function categoryForSkill(skillId?: ImplementedSkillId) {
  return categories.find(
    (category) => skillId && category.skillIds.includes(skillId),
  );
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
  const initialCategory = categoryForSkill(selectedSkillId) ?? categories[2];
  const [categoryId, setCategoryId] = useState(initialCategory.id);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? categories[2],
    [categoryId],
  );
  const selectedInActiveCategory =
    selectedSkillId !== undefined &&
    activeCategory.skillIds.includes(selectedSkillId);

  return (
    <section aria-label="第一层专项训练">
      <div className="grid trainingTypeGrid">
        {categories.map((category) => (
          <button
            aria-pressed={activeCategory.id === category.id}
            className={activeCategory.id === category.id ? "selected" : ""}
            disabled={category.disabled}
            key={category.id}
            onClick={() => {
              setCategoryId(category.id);
              setShowDifficulty(false);
            }}
            type="button"
          >
            <strong>{category.label}</strong>
            <small>{category.description}</small>
          </button>
        ))}
      </div>

      {!activeCategory.disabled && (
        <section
          className="divisionRulePanel"
          aria-label={`${activeCategory.label}专项`}
        >
          <p>{activeCategory.label} · 选择训练项目</p>
          <div className="divisionRuleOptions">
            {activeCategory.skillIds.map((skillId) => (
              <button
                aria-pressed={selectedSkillId === skillId}
                className={selectedSkillId === skillId ? "selected" : ""}
                key={skillId}
                onClick={() => {
                  onSelectSkill(skillId);
                  setShowDifficulty(false);
                }}
                type="button"
              >
                {abilityLabels[skillId] ?? skillId}
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedInActiveCategory && (
        <section className="divisionRulePanel" aria-label="专项难度">
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
            <div className="divisionRuleOptions compactDifficultyOptions">
              {difficultyOptions.map((option) => (
                <button
                  aria-pressed={difficultyBand === option.value}
                  className={difficultyBand === option.value ? "selected" : ""}
                  key={option.value}
                  onClick={() => onDifficultyChange(option.value)}
                  title={option.description}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
