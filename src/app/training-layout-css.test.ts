import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve("src/app/globals.css"), "utf8");

describe("mobile training layout CSS contract", () => {
  it("locks only the training page to the dynamic viewport", () => {
    expect(stylesheet).toMatch(
      /\.trainingPage\s*\{[^}]*height:\s*100dvh;[^}]*max-height:\s*100dvh;[^}]*overflow:\s*hidden;/s,
    );
    expect(stylesheet).toMatch(
      /\.trainingMain\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s,
    );
    expect(stylesheet).not.toMatch(
      /(?:^|\n)body\s*\{[^}]*overflow:\s*hidden;/s,
    );
  });

  it("keeps the keypad above the device safe area", () => {
    expect(stylesheet).toMatch(
      /\.trainingKeypad\s*\{[^}]*flex-shrink:\s*0;[^}]*safe-area-inset-bottom/s,
    );
    expect(stylesheet).toMatch(
      /\.pad button\s*\{[^}]*min-height:\s*clamp\(44px,/s,
    );
    expect(stylesheet).toMatch(
      /\.pad \.submit\s*\{[^}]*color:\s*var\(--ink\);/s,
    );
  });

  it("uses vertical fractions and a two-tier comparison action area", () => {
    expect(stylesheet).toMatch(
      /\.fractionComparisonQuestion\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\)/s,
    );
    expect(stylesheet).toMatch(
      /\.verticalFraction span:first-child\s*\{[^}]*border-bottom:/s,
    );
    expect(stylesheet).toMatch(
      /\.comparisonActions\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s,
    );
    expect(stylesheet).toMatch(
      /\.comparisonChoices\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s,
    );
  });

  it("keeps division sub-rules compact and touch friendly", () => {
    expect(stylesheet).toMatch(
      /\.divisionRuleOptions\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s,
    );
    expect(stylesheet).toMatch(
      /\.divisionRuleOptions button\s*\{[^}]*min-height:\s*44px;/s,
    );
  });
});
