import { describe, expect, it } from "vitest";
import { appendDecimal, toggleSign } from "./keypad";

describe("calculator keypad helpers", () => {
  it("toggles a leading negative sign", () => {
    expect(toggleSign("")).toBe("-");
    expect(toggleSign("123")).toBe("-123");
    expect(toggleSign("-123")).toBe("123");
  });

  it("adds no more than one decimal point", () => {
    expect(appendDecimal("")).toBe("0.");
    expect(appendDecimal("-")).toBe("-0.");
    expect(appendDecimal("12")).toBe("12.");
    expect(appendDecimal("12.3")).toBe("12.3");
  });
});
