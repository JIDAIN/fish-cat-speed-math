"use client";

import { useState } from "react";
import {
  FRACTION_PERCENT_LIBRARY,
  FractionPercentRelation,
} from "@/lib/generate";

type Direction = "fraction_to_percent" | "percent_to_fraction";

type MemoryGroup = {
  label: string;
  relations: readonly FractionPercentRelation[];
};

const common = FRACTION_PERCENT_LIBRARY.filter(
  ({ primaryStructure }) => primaryStructure === "common_non_unit_fraction",
);

const byDenominator = (...denominators: number[]) =>
  common.filter(({ denominator }) => denominators.includes(denominator));

const GROUPS: readonly MemoryGroup[] = [
  {
    label: "单位分数",
    relations: FRACTION_PERCENT_LIBRARY.filter(
      ({ primaryStructure }) => primaryStructure === "unit_fraction",
    ),
  },
  { label: "常用比例：3、4、5、6", relations: byDenominator(3, 4, 5, 6) },
  { label: "七分之一系", relations: byDenominator(7) },
  { label: "八分之一系", relations: byDenominator(8) },
  { label: "九分之一系", relations: byDenominator(9) },
  { label: "十二分之一系", relations: byDenominator(12) },
  { label: "十六分之一系", relations: byDenominator(16) },
];

function VerticalFraction({ relation }: { relation: FractionPercentRelation }) {
  return (
    <span
      className="memoryFraction"
      aria-label={`${relation.numerator}/${relation.denominator}`}
    >
      <span>{relation.numerator}</span>
      <span>{relation.denominator}</span>
    </span>
  );
}

function Equation({
  direction,
  relation,
}: {
  direction: Direction;
  relation: FractionPercentRelation;
}) {
  const percent = (
    <span className="memoryPercent">{relation.percentAnswer}%</span>
  );
  const fraction = <VerticalFraction relation={relation} />;
  return (
    <div className="memoryEquation">
      {direction === "fraction_to_percent" ? fraction : percent}
      <span className="memoryEquals">=</span>
      {direction === "fraction_to_percent" ? percent : fraction}
    </div>
  );
}

export function FractionPercentMemory() {
  const [direction, setDirection] = useState<Direction>("fraction_to_percent");
  return (
    <section className="fractionPercentMemory">
      <div className="memoryDirectionTabs" role="tablist" aria-label="速记方向">
        <button
          aria-selected={direction === "fraction_to_percent"}
          onClick={() => setDirection("fraction_to_percent")}
          role="tab"
          type="button"
        >
          分数 → 百分数
        </button>
        <button
          aria-selected={direction === "percent_to_fraction"}
          onClick={() => setDirection("percent_to_fraction")}
          role="tab"
          type="button"
        >
          百分数 → 分数
        </button>
      </div>
      <p className="memoryHint">
        46组固定关系，按分母规律分组；点击切换互转方向。
      </p>
      {GROUPS.map((group) => (
        <section className="memoryGroup" key={group.label}>
          <h2>{group.label}</h2>
          <div className="memoryGrid">
            {group.relations.map((relation) => (
              <Equation
                direction={direction}
                key={`${relation.numerator}/${relation.denominator}`}
                relation={relation}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
