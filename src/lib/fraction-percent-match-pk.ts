import { MatchGameBlueprint } from "./fraction-percent-match";

export type FractionPercentMatchPKStatus = "pending" | "completed";
export type FractionPercentMatchPKChallenge = {
  id: string;
  challengerId: string;
  challengerRole: "fish" | "cat";
  opponentId: string;
  opponentRole: "fish" | "cat";
  challengerRecordId: string;
  opponentRecordId?: string;
  blueprint: MatchGameBlueprint;
  relationSetVersion: string;
  gameVersion: string;
  status: FractionPercentMatchPKStatus;
  createdAt: number;
  completedAt?: number;
};
export type MatchPKOutcome = "fish" | "cat" | "draw";
export function matchPKOutcome(
  challenge: FractionPercentMatchPKChallenge,
  challengerTime: number,
  opponentTime?: number,
): MatchPKOutcome {
  if (opponentTime === undefined || challengerTime === opponentTime)
    return opponentTime === undefined ? "draw" : "draw";
  return challengerTime < opponentTime
    ? challenge.challengerRole
    : challenge.opponentRole;
}
