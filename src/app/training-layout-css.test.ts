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
    expect(stylesheet).toMatch(
      /\.fractionAnswerSlots\s*\{[^}]*display:\s*inline-grid;[^}]*grid-template-rows:/s,
    );
    expect(stylesheet).toMatch(
      /\.fractionAnswerLine\s*\{[^}]*height:\s*3px;[^}]*background:\s*var\(--green-700\);/s,
    );
    expect(stylesheet).not.toMatch(
      /\.fractionAnswerSlots button\s*\{[^}]*border-bottom:/s,
    );
    expect(stylesheet).toMatch(
      /\.fractionAnswerSlots button\.active\s*\{[^}]*background:\s*var\(--green-100\);[^}]*box-shadow:\s*inset 0 0 0 2px var\(--green-700\);/s,
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

  it("shows full questions above a labelled result row on narrow screens", () => {
    expect(stylesheet).toMatch(
      /@media \(max-width:\s*480px\)\s*\{[\s\S]*?\.questionTableHead\s*\{[^}]*display:\s*none;/,
    );
    expect(stylesheet).toMatch(
      /grid-template-areas:\s*"number prompt prompt prompt prompt"\s*"\. answer verdict correct duration";/,
    );
    expect(stylesheet).toMatch(
      /\.questionPrompt\s*\{[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(stylesheet).toMatch(
      /\.questionCellLabel\s*\{[^}]*display:\s*block;/s,
    );
  });

  it("keeps review scratch accessible and uses a three-icon safe-area toolbar", () => {
    expect(stylesheet).toMatch(
      /\.reviewScratchButton\s*\{[^}]*position:\s*fixed;[^}]*safe-area-inset-right[^}]*safe-area-inset-bottom/s,
    );
    expect(stylesheet).toMatch(
      /\.scratchTools\s*\{[^}]*grid-template-columns:\s*repeat\(3, 56px\)/s,
    );
    expect(stylesheet).toMatch(
      /\.scratchToolButton\s*\{[^}]*width:\s*56px;[^}]*min-height:\s*56px;/s,
    );
    expect(stylesheet).toMatch(
      /\.scratchPalette\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*64px;/s,
    );
  });
});
