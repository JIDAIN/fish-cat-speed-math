"use client";
import { useCallback, useEffect, useState } from "react";
import { CloudIdentity } from "@/lib/cloud";
import {
  readMatchHistory,
  syncMatchRecord,
} from "@/lib/fraction-percent-match-cloud";
import { FractionPercentMatchRecord } from "@/lib/fraction-percent-match";
import {
  readMatchRecords,
  saveMatchRecord,
} from "@/lib/fraction-percent-match-storage";

const stamp = (value: number) =>
  new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
export function FractionPercentMatchHistory({
  identity,
  userId,
  onHome,
  onGame,
}: {
  identity?: CloudIdentity;
  userId: "fish" | "cat";
  onHome: () => void;
  onGame: () => void;
}) {
  const [records, setRecords] = useState<FractionPercentMatchRecord[]>([]);
  const [notice, setNotice] = useState<string>();
  const load = useCallback(async () => {
    try {
      const local = await readMatchRecords(identity?.id);
      const cloud = identity ? await readMatchHistory() : [];
      const merged = [
        ...local,
        ...cloud.filter((item) => !local.some((saved) => saved.id === item.id)),
      ]
        .filter((item) => identity || item.userId === userId)
        .sort((a, b) => b.completedAt - a.completedAt);
      setRecords(merged);
    } catch {
      setNotice("历史读取失败，请稍后重试。");
    }
  }, [identity, userId]);
  useEffect(() => {
    void load();
  }, [load]);
  const retry = async (record: FractionPercentMatchRecord) => {
    try {
      if (!identity) return;
      await syncMatchRecord({ ...record, ownerAccountId: identity.id });
      const saved = {
        ...record,
        ownerAccountId: identity.id,
        syncStatus: "synced" as const,
        syncedAt: Date.now(),
      };
      await saveMatchRecord(saved);
      await load();
    } catch {
      setNotice("同步失败，记录仍保存在本机。");
    }
  };
  return (
    <main className="panel matchHistory">
      <div className="matchNav">
        <button onClick={onHome}>← 首页</button>
        <button onClick={onGame}>开始消消乐</button>
      </div>
      <h1>消消乐历史</h1>
      {identity && (
        <p className="matchHistoryUser">
          {identity.role === "fish" ? "🐟 小鱼" : "🐱 小猫"}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {records.length ? (
        <div>
          {records.map((record) => (
            <article className="matchHistoryRow" key={record.id}>
              <span>{stamp(record.completedAt)}</span>
              <strong>{(record.totalTimeMs / 1000).toFixed(1)}秒</strong>
              {record.syncStatus === "failed" && identity && (
                <button onClick={() => void retry(record)}>重试同步</button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p>还没有完成的消消乐记录。</p>
      )}
    </main>
  );
}
