"use client";

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

const groups: readonly SkillDrillGroup[] = [
  {
    id: "a_multiplication_facts",
    label: "A·乘法口诀",
    description: "正向口诀 + 4×□=24 这类逆向反应",
    skillIds: ["A-MUL-01", "A-MUL-02"],
  },
  {
    id: "a_complements",
    label: "A·补数 / 凑整",
    description: "整十、整百、整千与双向凑整",
    skillIds: ["A-COM-01", "A-COM-02", "A-COM-03", "A-COM-04"],
  },
  {
    id: "a_special_multipliers",
    label: "A·特殊乘数",
    description: "×5、×25、×125、×0.5、×1.5、×2.5",
    skillIds: [
      "A-SPM-01",
      "A-SPM-02",
      "A-SPM-03",
      "A-SPM-04",
      "A-SPM-05",
      "A-SPM-06",
    ],
  },
  {
    id: "a_multiple_sense",
    label: "A·倍数反应",
    description: "整倍数、十百倍迁移与反向倍数",
    skillIds: ["A-MAG-01", "A-MAG-02", "A-MAG-03"],
  },
  {
    id: "a_percent_blocks",
    label: "A·基础百分比块",
    description: "0.1%～50% 高频百分比直接反应",
    skillIds: [
      "A-PCT-01",
      "A-PCT-02",
      "A-PCT-03",
      "A-PCT-04",
      "A-PCT-05",
      "A-PCT-06",
      "A-PCT-07",
      "A-PCT-08",
      "A-PCT-09",
      "A-PCT-10",
      "A-PCT-11",
      "A-PCT-12",
    ],
  },
  {
    id: "a_place_value",
    label: "A·数位 / 小数点",
    description: "10倍迁移、1%、百分小数互换与量级",
    skillIds: [
      "A-PLACE-01",
      "A-PLACE-02",
      "A-PLACE-03",
      "A-PLACE-04",
      "A-PLACE-05",
      "A-PLACE-06",
    ],
  },
  {
    id: "b_base",
    label: "B·基准 / 锚点",
    description: "整十百千、百分比块与倒数分数锚点",
    skillIds: [
      "B-BASE-01",
      "B-BASE-02",
      "B-BASE-03",
      "B-BASE-04",
      "B-BASE-05",
    ],
  },
  {
    id: "b_percent_split",
    label: "B·百分数拆分",
    description: "把复杂百分比拆成低成本基础块",
    skillIds: ["B-PSPLIT-01", "B-PSPLIT-02"],
  },
  {
    id: "b_r",
    label: "B·求 r",
    description: "差值、基准、差值÷基准、符号与1%估 r",
    skillIds: [
      "B-R-01",
      "B-R-02",
      "B-R-03",
      "B-R-04",
      "B-R-05",
      "B-R-06",
      "B-R-07",
    ],
  },
  {
    id: "b_r_multiply",
    label: "B·数 × r",
    description: "单一、组合、两位百分比、负 r 与近似修正量",
    skillIds: [
      "B-RMUL-01",
      "B-RMUL-02",
      "B-RMUL-03",
      "B-RMUL-04",
      "B-RMUL-05",
    ],
  },
  {
    id: "b_approximation",
    label: "B·近似取舍",
    description: "四舍五入、主动上下取整、有效数字与低成本近似",
    skillIds: [
      "B-APP-01",
      "B-APP-02",
      "B-APP-03",
      "B-APP-04",
      "B-APP-05",
    ],
  },
  {
    id: "c_direct_division_steps",
    label: "C·直除步骤",
    description: "商区间、试商、调商、余量、下一位与停止判断",
    skillIds: [
      "C-DIV-05",
      "C-DIV-06",
      "C-DIV-07",
      "C-DIV-08",
      "C-DIV-09",
      "C-DIV-10",
      "C-DIV-11",
      "C-DIV-12",
      "C-DIV-13",
    ],
  },
];

const difficultyOptions: readonly {
  value: DifficultyBand;
  label: string;
  description: string;
}[] = [
  { value: "L1", label: "L1", description: "单结构 / 口算友好" },
  { value: "L2", label: "L2", description: "标准实战" },
  { value: "L3", label: "L3", description: "复合 / 边界结构" },
];

function groupForSkill(skillId?: ImplementedSkillId) {
  return groups.find((group) => skillId && group.skillIds.includes(skillId));
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
  const [groupId, setGroupId] = useState(
    selectedGroup?.id ?? groups[0].id,
  );
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === groupId) ?? groups[0],
    [groupId],
  );

  return (
    <section aria-label="纯计算能力专项">
      <div className="grid trainingTypeGrid">
        {groups.map((group) => (
          <button
            className={activeGroup.id === group.id ? "selected" : ""}
            key={group.id}
            onClick={() => setGroupId(group.id)}
            type="button"
          >
            <strong>{group.label}</strong>
            <small>{group.description}</small>
          </button>
        ))}
      </div>

      <section
        className="divisionRulePanel"
        aria-label={`${activeGroup.label}专项`}
      >
        <p>{activeGroup.label} · 选择具体能力</p>
        <div className="divisionRuleOptions">
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

      {selectedSkillId && (
        <section className="divisionRulePanel" aria-label="专项难度">
          <p>难度</p>
          <div className="divisionRuleOptions">
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
        </section>
      )}
    </section>
  );
}
