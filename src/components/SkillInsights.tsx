"use client";

import { summarizePathComparisons, PathRouteKey } from "@/lib/batch8-training";
import { masteryMatrix, recommendTraining } from "@/lib/mastery";
import { getSkillDefinition } from "@/lib/skill-registry";
import { TrainingSession } from "@/lib/types";

const users = [
  { id: "fish", label: "🐟 小鱼" },
  { id: "cat", label: "🐱 小猫" },
] as const;

const routeLabels: Record<PathRouteKey, string> = {
  direct: "直除",
  split: "除法拆分 / 包子法",
  scale: "除法补偿放缩",
};

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function seconds(value?: number) {
  return value === undefined ? "—" : `${(value / 1000).toFixed(2)}s`;
}

export function SkillInsights({ sessions }: { sessions: TrainingSession[] }) {
  return (
    <section aria-label="能力掌握与诊断" className="historyCharts">
      <h2>能力掌握与诊断</h2>
      <p className="historyChartsHint">
        掌握度按 skill_id + L1/L2/L3 分开累计；R/C/D 需最近30题，S/F需最近20题后才判“已掌握 / 未掌握”。后台中断题保留正确率，但不进入速度统计。推荐一次只给1～2个目标。
      </p>
      {users.map((user) => {
        const matrix = masteryMatrix(sessions, user.id);
        const recommendations = recommendTraining(sessions, user.id, 2);
        const path = summarizePathComparisons(sessions, user.id);
        const counts = {
          mastered: matrix.filter((item) => item.status === "mastered").length,
          accuracy: matrix.filter((item) => item.status === "accuracy_first").length,
          speed: matrix.filter((item) => item.status === "speed_limited").length,
          insufficient: matrix.filter((item) => item.status === "insufficient").length,
        };
        const hasPath = path.routes.some((route) => route.sampleCount > 0);

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
                        {item.diagnosticTargets.length ? (
                          <>
                            <br />
                            优先下钻：
                            {item.diagnosticTargets
                              .map((skillId) => getSkillDefinition(skillId).displayName)
                              .join("、")}
                          </>
                        ) : null}
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
                  <p>暂无可判断的专项数据。先完成几个纯计算专项，系统再开始积累掌握与诊断样本。</p>
                )}
              </section>

              <section className="userChart" aria-label={`${user.label}同题路径对比`}>
                <div className="userChartHeading">
                  <strong>同题路径对比</strong>
                  <span>
                    {hasPath && path.fastestRoute
                      ? `当前个人最快：${routeLabels[path.fastestRoute]}`
                      : "暂无对比记录"}
                  </span>
                </div>
                {hasPath ? (
                  path.routes.map((route) => (
                    <p key={route.route}>
                      <strong>{routeLabels[route.route]}</strong>：
                      {route.sampleCount}次 · 正确率 {percent(route.accuracy)} · 中位 {seconds(route.medianMs)} · P90 {seconds(route.p90Ms)}
                      {route.meanRelativeError !== undefined
                        ? ` · 平均相对误差 ${percent(route.meanRelativeError)}`
                        : ""}
                    </p>
                  ))
                ) : (
                  <p>完成“同题路径对比”后，这里会用你自己的实际耗时与误差比较直除、拆分和补偿放缩，不预设固定最优方法。</p>
                )}
              </section>
            </div>
          </article>
        );
      })}
    </section>
  );
}
