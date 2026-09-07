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
  choices?: readonly StructuredChoice[];
  disabled?: boolean;
  ariaLabel?: string;
};

export const DEFAULT_PERCENT_BLOCKS: readonly StructuredChoice[] = [
  { value: "100", label: "100%" },
  { value: "50", label: "50%" },
  { value: "25", label: "25%" },
  { value: "20", label: "20%" },
  { value: "10", label: "10%" },
  { value: "5", label: "5%" },
  { value: "2", label: "2%" },
  { value: "1", label: "1%" },
  { value: "0.1", label: "0.1%" },
];

/**
 * Shared V2 input primitive. Full step-flow state is intentionally kept out of
 * this component; it only reports a serialized answer for one current step.
 */
export function StructuredAnswerInput({
  kind,
  value,
  onChange,
  choices,
  disabled = false,
  ariaLabel = "答案",
}: StructuredAnswerInputProps) {
  if (kind === "number") {
    return (
      <input
        aria-label={ariaLabel}
        disabled={disabled}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    );
  }

  const options = kind === "percent_blocks" ? DEFAULT_PERCENT_BLOCKS : choices;

  if (kind === "choice") {
    return (
      <div aria-label={ariaLabel} role="group">
        {(options ?? []).map((choice) => (
          <button
            aria-pressed={value === choice.value}
            disabled={disabled}
            key={choice.value}
            onClick={() => onChange(choice.value)}
            type="button"
          >
            {choice.label}
          </button>
        ))}
      </div>
    );
  }

  if (kind === "percent_blocks" || kind === "sequence") {
    const selected = value ? value.split(",").filter(Boolean) : [];
    return (
      <div aria-label={ariaLabel} role="group">
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
        <button
          disabled={disabled || selected.length === 0}
          onClick={() => onChange(selected.slice(0, -1).join(","))}
          type="button"
        >
          撤回一步
        </button>
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
