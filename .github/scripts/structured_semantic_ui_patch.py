from pathlib import Path
import re

# 1) Replace the shared structured input with the final semantic controls.
Path("src/components/StructuredAnswerInput.tsx").write_text(r'''"use client";

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
''')

# 2) Add a single-answer semantic training renderer.
Path("src/components/StructuredSingleAnswerTraining.tsx").write_text(r'''"use client";

import { StructuredAnswerInput, StructuredChoice } from "./StructuredAnswerInput";
import { TrainingSession } from "@/lib/types";

type StructuredSingleAnswerTrainingProps = {
  session: TrainingSession;
  isRestarting: boolean;
  onChange: (session: TrainingSession) => void;
  onSubmit: (sessionOverride?: TrainingSession) => void;
  onRestart: () => void;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function questionChoices(session: TrainingSession): StructuredChoice[] {
  const question = session.questions[session.currentIndex];
  if (!question) return [];
  const values = stringArray(question.data.choiceValues);
  const labels = stringArray(question.data.choiceLabels);
  if (values.length && values.length === labels.length)
    return values.map((value, index) => ({ value, label: labels[index] }));
  return (question.allowedAnswerSet ?? []).map((value) => ({
    value: String(value),
    label: String(value),
  }));
}

export function StructuredSingleAnswerTraining({
  session,
  isRestarting,
  onChange,
  onSubmit,
  onRestart,
}: StructuredSingleAnswerTrainingProps) {
  const question = session.questions[session.currentIndex];
  if (
    !question ||
    (question.inputKind !== "choice" &&
      question.inputKind !== "sequence" &&
      question.inputKind !== "percent_blocks")
  )
    return null;

  const commitsImmediately =
    question.inputKind === "choice" || question.inputKind === "sequence";
  const choices = questionChoices(session);
  const updateAnswer = (value: string) => {
    onChange({ ...session, currentAnswer: value });
  };
  const commitAnswer = (value: string) => {
    onSubmit({ ...session, currentAnswer: value });
  };

  return (
    <section className="structuredSingleTraining" aria-label="结构化专项作答">
      <h1>{question.prompt}</h1>
      <p className="rule">
        {question.inputKind === "choice"
          ? "点选答案后自动进入下一题"
          : question.inputKind === "sequence"
            ? "点选更省操作的完整顺序后自动进入下一题"
            : "按顺序点击百分比块，组合完成后确认"}
      </p>
      <StructuredAnswerInput
        ariaLabel="结构化答案"
        choices={choices}
        kind={question.inputKind}
        onChange={updateAnswer}
        onCommit={commitsImmediately ? commitAnswer : undefined}
        value={session.currentAnswer}
      />
      <div className="structuredSingleActions">
        <button
          className="restartTrainingButton"
          disabled={isRestarting}
          onClick={onRestart}
          type="button"
        >
          {isRestarting ? "正在重开…" : "重开训练"}
        </button>
        {question.inputKind === "percent_blocks" ? (
          <button
            className="primary"
            disabled={!session.currentAnswer}
            onClick={() => onSubmit()}
            type="button"
          >
            确认组合
          </button>
        ) : null}
      </div>
    </section>
  );
}
''')

# 3) Stop mutating newly generated semantic skill questions into numeric codes.
session_path = Path("src/lib/session.ts")
text = session_path.read_text()
text, count = re.subn(
    r'\nconst percentBlockNumericCodes:.*?\nfunction adaptSkillQuestionToCurrentTrainingUi\(.*?\n\}\n\n/\*\* Creates one entirely fresh training run from frozen training parameters\. \*/',
    '\n\n/** Creates one entirely fresh training run from frozen training parameters. */',
    text,
    count=1,
    flags=re.S,
)
assert count == 1, "session semantic adapter block not found"
old = '''    (questionType === "skill_drill"\n      ? (generatedSkillQuestions ?? []).map(adaptSkillQuestionToCurrentTrainingUi)\n      : generateSet(questionType, subtype, questionCount, generationContext).map('''
new = '''    (questionType === "skill_drill"\n      ? (generatedSkillQuestions ?? [])\n      : generateSet(questionType, subtype, questionCount, generationContext).map('''
assert old in text, "session generated-skill mapping changed unexpectedly"
session_path.write_text(text.replace(old, new, 1))

# 4) Wire semantic controls into the main training page and allow immediate semantic submission.
page = Path("src/app/page.tsx")
text = page.read_text()
old = 'import { StructuredStepTraining } from "@/components/StructuredStepTraining";\n'
new = old + 'import { StructuredSingleAnswerTraining } from "@/components/StructuredSingleAnswerTraining";\n'
assert old in text, "page structured step import not found"
text = text.replace(old, new, 1)

old = '''  const submit = () => {\n    if (!session) return;\n    const submittedAt = Date.now();\n    const next =\n      current?.inputKind === "steps"\n        ? submitCurrentStep(session, elapsed, scratch, submittedAt)\n        : submitCurrentAnswer(session, elapsed, scratch, submittedAt);\n    if (next === session) return;'''
new = '''  const submit = (sessionOverride?: TrainingSession) => {\n    const activeSession = sessionOverride ?? session;\n    if (!activeSession) return;\n    const activeQuestion = activeSession.questions[activeSession.currentIndex];\n    const submittedAt = Date.now();\n    const next =\n      activeQuestion?.inputKind === "steps"\n        ? submitCurrentStep(activeSession, elapsed, scratch, submittedAt)\n        : submitCurrentAnswer(activeSession, elapsed, scratch, submittedAt);\n    if (next === activeSession) return;'''
assert old in text, "page submit function prefix changed unexpectedly"
text = text.replace(old, new, 1)

old = '''          {current.inputKind !== "steps" && session.subtype !== "percent_to_fraction" ? ('''
new = '''          {current.inputKind !== "steps" &&\n          session.subtype !== "percent_to_fraction" &&\n          !(\n            current.type === "skill_drill" &&\n            (current.inputKind === "choice" ||\n              current.inputKind === "sequence" ||\n              current.inputKind === "percent_blocks")\n          ) ? ('''
assert old in text, "page rule condition changed unexpectedly"
text = text.replace(old, new, 1)

old = '''          ) : session.questionType === "fraction_comparison" ? ('''
new = '''          ) : current.type === "skill_drill" &&\n            (current.inputKind === "choice" ||\n              current.inputKind === "sequence" ||\n              current.inputKind === "percent_blocks") ? (\n            <StructuredSingleAnswerTraining\n              isRestarting={isRestartingTraining}\n              onChange={(nextSession) => {\n                sessionRef.current = nextSession;\n                setSession(nextSession);\n              }}\n              onRestart={restartTraining}\n              onSubmit={submit}\n              session={session}\n            />\n          ) : session.questionType === "fraction_comparison" ? ('''
assert old in text, "page semantic render insertion point changed unexpectedly"
text = text.replace(old, new, 1)

old = '''          {current.inputKind === "steps" ? null : session.questionType === "fraction_comparison" ? ('''
new = '''          {current.inputKind === "steps" ||\n          (current.type === "skill_drill" &&\n            (current.inputKind === "choice" ||\n              current.inputKind === "sequence" ||\n              current.inputKind === "percent_blocks")) ? null : session.questionType === "fraction_comparison" ? ('''
assert old in text, "page keypad condition changed unexpectedly"
text = text.replace(old, new, 1)
page.write_text(text)

# 5) Add responsive styling that reuses the existing green visual language.
css = Path("src/app/globals.css")
text = css.read_text()
marker = '''.comparisonActions .primary:disabled {\n  cursor: not-allowed;\n  opacity: 0.5;\n}\n'''
assert marker in text, "structured UI CSS insertion marker changed unexpectedly"
addition = marker + r'''
.structuredSingleTraining,
.structuredStepTraining {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}
.structuredSingleTraining h1,
.structuredStepTraining h1 {
  font-size: clamp(24px, min(7.8vw, 5dvh), 40px);
  line-height: 1.18;
}
.structuredStepTraining h2 {
  margin: clamp(8px, 1.4dvh, 14px) 0;
  font-size: clamp(18px, 5vw, 24px);
  line-height: 1.3;
}
.structuredOptionGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  margin: clamp(10px, 2dvh, 18px) auto 0;
}
.structuredSequenceGrid {
  grid-template-columns: 1fr;
}
.structuredOptionGrid button {
  min-height: clamp(58px, 9dvh, 78px);
  padding: 12px 14px;
  border: 1px solid var(--line);
  background: var(--card);
  font-size: clamp(16px, 4.4vw, 19px);
  line-height: 1.35;
  text-align: left;
  touch-action: manipulation;
}
.structuredOptionGrid button.selected {
  border-color: var(--green-700);
  outline: 0;
  background: var(--green-100) !important;
}
.structuredPercentBuilder {
  display: grid;
  gap: 10px;
  margin-top: clamp(8px, 1.6dvh, 16px);
}
.structuredSelectionPreview {
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  font-size: clamp(17px, 4.8vw, 21px);
  font-weight: 700;
  line-height: 1.35;
}
.structuredPercentGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.structuredPercentGrid button {
  min-height: clamp(48px, 7dvh, 62px);
  padding: 8px 5px;
  font-size: clamp(15px, 4.2vw, 18px);
  touch-action: manipulation;
}
.structuredEditActions,
.structuredSingleActions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.structuredEditActions button {
  min-height: 44px;
  background: transparent;
  color: var(--muted);
}
.structuredSingleActions {
  margin-top: auto;
  padding: 10px 0 max(8px, env(safe-area-inset-bottom));
}
.structuredSingleActions button {
  min-height: clamp(48px, 7dvh, 62px);
  font-size: 16px;
}
.structuredSingleActions .restartTrainingButton:only-child {
  grid-column: 1 / -1;
}
.structuredNumberInput {
  width: 100%;
  min-height: 52px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  color: var(--ink);
  font: inherit;
  font-size: 22px;
  text-align: center;
}
@media (max-width: 420px) {
  .structuredOptionGrid {
    grid-template-columns: 1fr;
  }
  .structuredPercentGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
'''
css.write_text(text.replace(marker, addition, 1))

# 6) Update shared component tests.
Path("src/components/StructuredAnswerInput.test.tsx").write_text(r'''import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PERCENT_BLOCKS,
  StructuredAnswerInput,
} from "./StructuredAnswerInput";

afterEach(cleanup);

describe("StructuredAnswerInput", () => {
  it("supports numeric input without parsing free-form expressions", () => {
    const onChange = vi.fn();
    render(
      <StructuredAnswerInput kind="number" onChange={onChange} value="" />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "答案" }), {
      target: { value: "12.5" },
    });
    expect(onChange).toHaveBeenCalledWith("12.5");
  });

  it("renders semantic choice and sequence alternatives directly", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <StructuredAnswerInput
        choices={[
          { value: "2,1", label: "先减13，再减487" },
          { value: "1,2", label: "先减487，再减13" },
        ]}
        kind="sequence"
        onChange={onChange}
        onCommit={onCommit}
        value=""
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "先减13，再减487" }));
    expect(onChange).toHaveBeenCalledWith("2,1");
    expect(onCommit).toHaveBeenCalledWith("2,1");
  });

  it("uses every frozen percentage block required by current split generators", () => {
    expect(DEFAULT_PERCENT_BLOCKS.map((item) => item.value)).toEqual([
      "100",
      "50",
      "25",
      "20",
      "12.5",
      "10",
      "5",
      "3",
      "2.5",
      "2",
      "1",
      "0.1",
    ]);
    const onChange = vi.fn();
    render(
      <StructuredAnswerInput
        kind="percent_blocks"
        onChange={onChange}
        value="12.5,2.5"
      />,
    );
    expect(screen.getByLabelText("答案已选组合").textContent).toBe(
      "12.5% + 2.5%",
    );
    fireEvent.click(screen.getByRole("button", { name: "3%" }));
    expect(onChange).toHaveBeenCalledWith("12.5,2.5,3");
  });
});
''')

# 7) Add a focused semantic single-answer component test.
Path("src/components/StructuredSingleAnswerTraining.test.tsx").write_text(r'''import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StructuredSingleAnswerTraining } from "./StructuredSingleAnswerTraining";
import { TrainingSession } from "@/lib/types";

const baseSession: TrainingSession = {
  id: "structured-single",
  userId: "fish",
  questionType: "skill_drill",
  subtype: "skill:B-R-05:L2",
  questionCount: 10,
  questions: [
    {
      id: "q1",
      type: "skill_drill",
      subtype: "skill_drill",
      prompt: "分母变大，商应怎样修正？",
      answer: "down",
      data: {
        choiceValues: ["up", "down"],
        choiceLabels: ["向上修正", "向下修正"],
      },
      difficulty: { level: 3, tags: [] },
      primaryStructure: "direction",
      secondaryTags: [],
      generationRuleVersion: "test",
      skillId: "B-R-05",
      difficultyBand: "L2",
      masteryProfile: "D",
      inputKind: "choice",
      allowedAnswerSet: ["down"],
    },
  ],
  currentIndex: 0,
  records: [],
  currentAnswer: "",
  currentRestartCount: 0,
  accumulatedMs: 0,
  runningSince: 1,
  pauseDurationMs: 0,
  status: "active",
  startedAt: 1,
};

afterEach(cleanup);

describe("StructuredSingleAnswerTraining", () => {
  it("submits semantic choice values immediately instead of asking for keypad codes", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <StructuredSingleAnswerTraining
        isRestarting={false}
        onChange={onChange}
        onRestart={vi.fn()}
        onSubmit={onSubmit}
        session={baseSession}
      />,
    );
    expect(screen.queryByText(/1=/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "向下修正" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ currentAnswer: "down" }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currentAnswer: "down" }),
    );
  });

  it("keeps percentage-block composition editable until explicit confirmation", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const session: TrainingSession = {
      ...baseSession,
      subtype: "skill:B-PSPLIT-01:L2",
      questions: [
        {
          ...baseSession.questions[0],
          skillId: "B-PSPLIT-01",
          prompt: "把17%拆成基础百分比块",
          answer: "10,5,2",
          inputKind: "percent_blocks",
          allowedAnswerSet: ["10,5,2"],
          data: {},
        },
      ],
    };
    render(
      <StructuredSingleAnswerTraining
        isRestarting={false}
        onChange={onChange}
        onRestart={vi.fn()}
        onSubmit={onSubmit}
        session={session}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "10%" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ currentAnswer: "10" }),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
''')

# 8) Update the session-level adapter regression test to assert preserved semantics.
test_path = Path("src/lib/session.test.ts")
text = test_path.read_text()
pattern = r'  it\("temporarily encodes semantic choice, sequence and percent-block drills for the shared NumberPad", \(\) => \{.*?\n  \}\);'
replacement = r'''  it("keeps choice, sequence and percent-block drills semantic in new sessions", () => {
    const choice = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:B-R-05:L2",
      questionCount: 10,
      generationContext: deterministicContext("choice"),
    });
    const sequence = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:B-ORDER-01:L2",
      questionCount: 10,
      generationContext: deterministicContext("sequence"),
    });
    const split = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:B-PSPLIT-01:L2",
      questionCount: 10,
      generationContext: deterministicContext("split"),
    });

    expect(choice.questions[0].inputKind).toBe("choice");
    expect(choice.questions[0].data.choiceLabels).toBeTruthy();
    expect(choice.questions[0].generatorParams?.uiAdapter).toBeUndefined();
    expect(choice.questions[0].prompt).not.toContain("1=");

    expect(sequence.questions[0].inputKind).toBe("sequence");
    expect(sequence.questions[0].data.choiceLabels).toBeTruthy();
    expect(sequence.questions[0].generatorParams?.uiAdapter).toBeUndefined();
    expect(sequence.questions[0].answer).toContain(",");

    expect(split.questions[0].inputKind).toBe("percent_blocks");
    expect(split.questions[0].generatorParams?.uiAdapter).toBeUndefined();
    expect(split.questions[0].prompt).not.toContain("按块依次输入代码");
    expect(split.questions[0].answer).toContain(",");
  });'''
text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
assert count == 1, "session semantic test block not found"
test_path.write_text(text)

# 9) Rename the batch-7 test description: there is no longer a session numeric adapter.
path = Path("src/lib/batch7-skill-generate.test.ts")
text = path.read_text()
old = 'it("keeps B-ORDER as semantic sequence tasks before the session UI adapter", () => {'
new = 'it("keeps B-ORDER as semantic sequence tasks for the structured UI", () => {'
assert old in text, "batch7 sequence test title changed unexpectedly"
path.write_text(text.replace(old, new, 1))

# 10) Add a page integration test proving semantic choice bypasses NumberPad and auto-submits.
path = Path("src/app/page.test.tsx")
text = path.read_text()
old = 'import { GeneratedQuestion, TrainingSession } from "@/lib/types";\n'
new = old + 'import { createTrainingSession } from "@/lib/session";\n'
assert old in text, "page test type import not found"
text = text.replace(old, new, 1)
marker = '''  it("commits the ten-question quick choice into a new active session", async () => {'''
assert marker in text, "page test insertion marker not found"
addition = r'''  it("renders a new semantic choice drill as buttons and submits the semantic value on tap", async () => {
    const semanticSession = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:B-R-05:L2",
      questionCount: 10,
      createSessionId: () => "semantic-ui-session",
    });
    await saveSession(semanticSession);
    const semanticQuestion = semanticSession.questions[0];
    expect(semanticQuestion.inputKind).toBe("choice");
    const values = semanticQuestion.data.choiceValues as string[];
    const labels = semanticQuestion.data.choiceLabels as string[];
    const answerIndex = values.indexOf(semanticQuestion.answer);
    expect(answerIndex).toBeGreaterThanOrEqual(0);

    render(<Home />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));

    expect(await screen.findByRole("button", { name: labels[answerIndex] })).toBeTruthy();
    expect(screen.queryByText(/按块依次输入代码/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: labels[answerIndex] }));

    await waitFor(async () => {
      const stored = await readActive();
      expect(stored?.records[0]).toMatchObject({
        userAnswer: semanticQuestion.answer,
        isCorrect: true,
      });
      expect(stored?.currentIndex).toBe(1);
    });
  });

'''
path.write_text(text.replace(marker, addition + marker, 1))
