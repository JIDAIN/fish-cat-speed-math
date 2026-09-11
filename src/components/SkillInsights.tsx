"use client";

import { masteryMatrix, recommendTraining } from "@/lib/mastery";
import { getSkillDefinition } from "@/lib/skill-registry";
import { TrainingSession } from "@/lib/types";

const users = [
  { id: "fish", label: "🐟 小鱼" },
  { id: "cat", label: "🐱 小猫" },
] as const;

export function SkillInsights({ sessions }: { sessions: TrainingSession[] }) {
  return (
    <section aria-label="A层能力掌握与诊断" className="historyCharts">
      <h2>A层能力掌握与诊断</h2>
      <p className="historyChartsHint">
        这里只统计当前8个正式A能力。经典训练保持原义，不事后映射；数字结构用于找薄弱点，但不会重新生成微叶子能力。
      </p>
      {users.map((user) => {
        const matrix = masteryMatrix(sessions, user.id);
        const recommendations = recommendTraining(sessions, user.id, 2);
        const counts = {
          mastered: matrix.filter((item) => item.status === "mastered").length,
          accuracy: matrix.filter((item) => item.status === "accuracy_first").length,
          speed: matrix.filter((item) => item.status === "speed_limited").length,
          insufficient: matrix.filter((item) => item.status === "insufficient").length,
        };

        return (
          <article className="trackCharts" key={user.id}>
            <div className="trackTitle">
              <h3>{user.label}</h3>
              <span>
                已掌握 {counts.mastered} · 正确性优先 {counts.accuracy} · 会但慢 {counts.speed} · 数据不足 {counts.insufficient}
              </span>
            </div>

            <div className="userChartGrid">
              <section className="userChart" aria-label={`${user.label}训练推荐`}>
                <div className="userChartHeading">
                  <strong>下一轮建议</strong>
                  <span>最多2项</span>
                </div>
                {recommendations.length ? (
                  recommendations.map((item) => {
                    const definition = getSkillDefinition(item.skillId);
                    return (
                      <p key={`${item.skillId}-${item.difficultyBand}`}>
                        <strong>
                          {definition.displayName} · {item.difficultyBand}
                        </strong>
                        <br />
                        {item.reason}（{item.sampleCount}/{item.requiredSampleCount}）
                        {item.weakStructures.length ? (
                          <>
                            <br />
                            高频错误结构：{item.weakStructures.join("、")}
                          </>
                        ) : null}
                      </p>
                    );
                  })
                ) : (
                  <p>暂无可判断的A层专项数据。先完成几个A层专项，系统再开始积累掌握与诊断样本。</p>
                )}
              </section>
            </div>
          </article>
        );
      })}
    </section>
  );
}
