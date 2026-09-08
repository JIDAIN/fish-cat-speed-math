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
