"use client";

import { useMemo, useState } from "react";
import { getSkillDefinition } from "@/lib/skill-registry";
import { FoundationSkillId } from "@/lib/skill-generate";
import { DifficultyBand } from "@/lib/types";

type FoundationGroup = {
  id: string;
  label: string;
  description: string;
  skillIds: readonly FoundationSkillId[];
};

const groups: readonly FoundationGroup[] = [
  {
    id: "multiplication_facts",
    label: "乘法口诀",
    description: "正向口诀 + 4×□=24 这类逆向反应",
    skillIds: ["A-MUL-01", "A-MUL-02"],
  },
  {
    id: "complements",
    label: "补数 / 凑整",
    description: "整十、整百、整千与双向凑整",
    skillIds: ["A-COM-01", "A-COM-02", "A-COM-03", "A-COM-04"],
  },
  {
    id: "special_multipliers",
    label: "特殊乘数",
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
    id: "multiple_sense",
    label: "倍数反应",
    description: "整倍数、十百倍迁移与反向倍数",
    skillIds: ["A-MAG-01", "A-MAG-02", "A-MAG-03"],
  },
  {
    id: "percent_blocks",
    label: "基础百分比块",
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
    id: "place_value",
    label: "数位 / 小数点",
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

function groupForSkill(skillId?: FoundationSkillId) {
  return groups.find((group) => skillId && group.skillIds.includes(skillId));
}

type FoundationSkillSelectorProps = {
  selectedSkillId?: FoundationSkillId;
  difficultyBand: DifficultyBand;
  onSelectSkill: (skillId: FoundationSkillId) => void;
  onDifficultyChange: (difficultyBand: DifficultyBand) => void;
};

export function FoundationSkillSelector({
  selectedSkillId,
  difficultyBand,
  onSelectSkill,
  onDifficultyChange,
}: FoundationSkillSelectorProps) {
  const selectedGroup = groupForSkill(selectedSkillId);
  const [groupId, setGroupId] = useState(
    selectedGroup?.id ?? groups[0].id,
  );
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === groupId) ?? groups[0],
    [groupId],
  );

  return (
    <section aria-label="基础自动化专项">
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

      <section className="divisionRulePanel" aria-label={`${activeGroup.label}专项`}>
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
