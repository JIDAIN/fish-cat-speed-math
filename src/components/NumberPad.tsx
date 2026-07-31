"use client";

import { appendDecimal, toggleSign } from "@/lib/keypad";

type NumberPadProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

/**
 * Shared calculator keypad for every numeric-answer question.
 * Fraction comparison and multiple-choice questions intentionally use their
 * own controls because they do not accept a numeric string as an answer.
 */
export function NumberPad({ value, onChange, onSubmit }: NumberPadProps) {
  const append = (digit: string) => onChange(`${value}${digit}`);
  const cannotSubmit = !value || value === "-" || value.endsWith(".");

  return (
    <div className="pad" aria-label="计算器数字键盘">
      <button
        aria-label="切换正负号"
        onClick={() => onChange(toggleSign(value))}
      >
        ±
      </button>
      <button aria-label="清空答案" onClick={() => onChange("")}>
        清空
      </button>
      <button aria-label="退格" onClick={() => onChange(value.slice(0, -1))}>
        退格
      </button>

      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button key={digit} onClick={() => append(digit)}>
          {digit}
        </button>
      ))}

      <button
        aria-label="小数点"
        onClick={() => onChange(appendDecimal(value))}
      >
        .
      </button>
      <button onClick={() => append("0")}>0</button>
      <button
        className="primary submit"
        disabled={cannotSubmit}
        onClick={onSubmit}
      >
        确定
      </button>
    </div>
  );
}
