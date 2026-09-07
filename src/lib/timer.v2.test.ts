import { describe, expect, it } from "vitest";
import {
  currentStepElapsedMs,
  finishStepTimer,
  interruptStepTimer,
  pauseStepTimer,
  resumeStepTimer,
  startStepTimer,
} from "./timer";

describe("step timer", () => {
  it("accumulates only active step time across pauses", () => {
    let timer = startStepTimer(1_000);
    timer = pauseStepTimer(timer, 1_600);
    expect(currentStepElapsedMs(timer, 5_000)).toBe(600);
    timer = resumeStepTimer(timer, 8_000);
    expect(currentStepElapsedMs(timer, 8_400)).toBe(1_000);
    expect(finishStepTimer(timer, 8_500)).toEqual({
      durationMs: 1_100,
      timingInterrupted: false,
    });
  });

  it("marks background-invalidated timing without inventing extra duration", () => {
    const interrupted = interruptStepTimer(pauseStepTimer(startStepTimer(0), 500));
    expect(finishStepTimer(interrupted, 9_000)).toEqual({
      durationMs: 500,
      timingInterrupted: true,
    });
  });
});
