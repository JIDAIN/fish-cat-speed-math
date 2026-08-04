import { getRating, Rating, sessionMetrics } from "./statistics";
import { TrainingSession } from "./types";

export type PKChallengeStatus = "pending" | "completed";

export type PKChallenge = {
  id: string;
  challengerId: string;
  challengerRole: "fish" | "cat";
  opponentId: string;
  opponentRole: "fish" | "cat";
  sourceSessionId: string;
  frozenSession: TrainingSession;
  opponentSessionId?: string;
  createdAt: number;
  completedAt?: number;
  status: PKChallengeStatus;
};

export type PKOutcome = "fish" | "cat" | "draw";

export function pkOutcome(
  challenge: PKChallenge,
  opponent?: TrainingSession,
): PKOutcome {
  if (!opponent) return "draw";
  const challenger = sessionMetrics(challenge.frozenSession);
  const responder = sessionMetrics(opponent);
  if (challenger.correctCount !== responder.correctCount)
    return challenger.correctCount > responder.correctCount
      ? challenge.challengerRole
      : challenge.opponentRole;
  if (challenge.frozenSession.accumulatedMs !== opponent.accumulatedMs)
    return challenge.frozenSession.accumulatedMs < opponent.accumulatedMs
      ? challenge.challengerRole
      : challenge.opponentRole;
  return "draw";
}

export function pkReason(challenge: PKChallenge, opponent: TrainingSession) {
  const challenger = sessionMetrics(challenge.frozenSession);
  const responder = sessionMetrics(opponent);
  if (challenger.correctCount !== responder.correctCount)
    return "正确题数更多，因此获胜。";
  if (challenge.frozenSession.accumulatedMs !== opponent.accumulatedMs)
    return "双方正确题数相同，总有效用时更短，因此获胜。";
  return "双方正确题数和总有效用时都相同，因此平局。";
}

export function pkParticipantSummary(session: TrainingSession) {
  const metrics = sessionMetrics(session);
  return { ...metrics, rating: getRating(session) as Rating };
}

export function isWithinLastSevenNaturalDays(
  completedAt: number,
  now = Date.now(),
) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const earliest = today.getTime() - 6 * 24 * 60 * 60 * 1000;
  return completedAt >= earliest;
}

export function paginate<T>(items: T[], requestedPage: number, pageSize = 20) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    totalPages,
    total: items.length,
  };
}
