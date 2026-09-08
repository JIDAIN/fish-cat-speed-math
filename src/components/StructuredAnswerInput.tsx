"use client";

import React from "react";
import { StructuredInputKind } from "@/lib/types";

export type StructuredChoice = {
  value: string;
  label: string;
};

type StructuredAnswerInputProps = {
  kind: StructuredInputKind;
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  choices?: readonly StructuredChoice[];
  disabled?: boolean;
  ariaLabel?: string;
};

export const DEFAULT_PERCENT_BLOCKS: readonly StructuredChoice[] = [
  { value: "100", label: "100%" },
  { value: "50", label: "50%" },
  { value: "25", label: "25%" },
  { value: "20", label: "20%" },
  { value: "12.5", label: "12.5%" },
  { value: "10", label: "10%" },
  { value: "5", label: "5%" },
  { value: "3", label: "3%" },
  { value: "2.5", label: "2.5%" },
  { value: "2", label: "2%" },
  { value: "1", label: "1%" },
  { value: "0.1", label: "0.1%" },
];

/**
 * Shared V2 input primitive. It preserves semantic answer values instead of
 * translating decisions into numeric keypad codes.
 */
export function StructuredAnswerInput({
  kind,
  value,
  onChange,
  onCommit,
  choices,
  disabled = false,
  ariaLabel = "答案",
}: StructuredAnswerInputProps) {
  if (kind === "number") {
    return (
      <input
        aria-label={ariaLabel}
        className="structuredNumberInput"
        disabled={disabled}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    );
  }

  const options = kind === "percent_blocks" ? DEFAULT_PERCENT_BLOCKS : choices;

  if (kind === "choice" || kind === "sequence") {
    return (
      <div
        aria-label={ariaLabel}
        className={
          kind === "sequence"
            ? "structuredOptionGrid structuredSequenceGrid"
            : "structuredOptionGrid"
        }
        role="group"
      >
        {(options ?? []).map((choice) => (
          <button
            aria-pressed={value === choice.value}
            className={value === choice.value ? "selected" : ""}
            disabled={disabled}
            key={choice.value}
            onClick={() => {
              onChange(choice.value);
              onCommit?.(choice.value);
            }}
            type="button"
          >
            {choice.label}
          </button>
        ))}
      </div>
    );
  }

  if (kind === "percent_blocks") {
    const selected = value ? value.split(",").filter(Boolean) : [];
    const labelFor = (selectedValue: string) =>
      DEFAULT_PERCENT_BLOCKS.find((item) => item.value === selectedValue)?.label ??
      `${selectedValue}%`;
    return (
      <div className="structuredPercentBuilder">
        <div
          aria-label={`${ariaLabel}已选组合`}
          aria-live="polite"
          className="structuredSelectionPreview"
        >
          {selected.length
            ? selected.map(labelFor).join(" + ")
            : "还未选择百分比块"}
        </div>
        <div
          aria-label={ariaLabel}
          className="structuredPercentGrid"
          role="group"
        >
          {(options ?? []).map((choice) => (
            <button
              disabled={disabled}
              key={choice.value}
              onClick={() =>
                onChange([...selected, choice.value].filter(Boolean).join(","))
              }
              type="button"
            >
              {choice.label}
            </button>
          ))}
        </div>
        <div className="structuredEditActions">
          <button
            disabled={disabled || selected.length === 0}
            onClick={() => onChange(selected.slice(0, -1).join(","))}
            type="button"
          >
            撤回一步
          </button>
          <button
            disabled={disabled || selected.length === 0}
            onClick={() => onChange("")}
            type="button"
          >
            清空组合
          </button>
        </div>
      </div>
    );
  }

  // "steps" is an orchestration mode. The current step chooses its own actual
  // input primitive, so this fallback deliberately stays text-based and simple.
  return (
    <input
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  );
}
