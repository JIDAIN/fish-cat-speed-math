"use client";
import {
  FractionPercentMatchPKChallenge,
  matchPKOutcome,
} from "@/lib/fraction-percent-match-pk";
import { FractionPercentMatchRecord } from "@/lib/fraction-percent-match";
export function FractionPercentMatchPKPage({
  challenges,
  records,
  identityId,
  onHome,
  onStart,
}: {
  challenges: FractionPercentMatchPKChallenge[];
  records: FractionPercentMatchRecord[];
  identityId?: string;
  onHome: () => void;
  onStart: (challenge: FractionPercentMatchPKChallenge) => void;
}) {
  const own = (id: string) => records.find((record) => record.id === id);
  const pending = challenges.filter((item) => item.status === "pending");
  const completed = challenges.filter((item) => item.status === "completed");
  return (
    <main className="panel">
      <button onClick={onHome}>← 首页</button>
      <h1>消消乐PK</h1>
      <h2>待我处理</h2>
      {pending
        .filter((item) => item.opponentId === identityId)
        .map((item) => (
          <article className="pkCard" key={item.id}>
            <b>
              {item.challengerRole === "fish" ? "🐟 小鱼" : "🐱 小猫"}
              向你发起消消乐挑战
            </b>
            <p>32组核心关系</p>
            <button className="primary" onClick={() => onStart(item)}>
              开始挑战
            </button>
          </article>
        ))}
      <h2>等待对方</h2>
      {pending
        .filter((item) => item.challengerId === identityId)
        .map((item) => (
          <article className="pkCard" key={item.id}>
            <b>等待对方完成挑战</b>
            <p>
              我的成绩：
              {(
                (own(item.challengerRecordId)?.totalTimeMs ?? 0) / 1000
              ).toFixed(1)}
              秒
            </p>
          </article>
        ))}
      <h2>近7日已完成</h2>
      {completed.map((item) => {
        const first = own(item.challengerRecordId);
        const second = own(item.opponentRecordId ?? "");
        const outcome =
          first && second
            ? matchPKOutcome(item, first.totalTimeMs, second.totalTimeMs)
            : "draw";
        return (
          <article className="pkCard" key={item.id}>
            <b>
              百分互换消消乐 ·{" "}
              {outcome === "draw"
                ? "平局"
                : outcome === "fish"
                  ? "🐟胜"
                  : "🐱胜"}
            </b>
            <p>
              {first ? `${(first.totalTimeMs / 1000).toFixed(1)}秒` : "—"}　
              {second ? `${(second.totalTimeMs / 1000).toFixed(1)}秒` : "—"}
            </p>
          </article>
        );
      })}
    </main>
  );
}
