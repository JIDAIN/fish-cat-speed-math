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
  const [selectedUser, setSelectedUser] = useState<"fish" | "cat">(
    identity?.role ?? userId,
  );
  const load = useCallback(async () => {
    let local: FractionPercentMatchRecord[] = [];
    let localFailed = false;
    try {
      local = await readMatchRecords(identity?.id);
      setRecords(local.filter((item) => item.userId === selectedUser));
    } catch {
      localFailed = true;
      setNotice("本机历史读取失败，正在尝试云端记录。");
    }
    if (!identity) return;
    try {
      const cloud = await readMatchHistory();
      const merged = [
        ...local,
        ...cloud.filter((item) => !local.some((saved) => saved.id === item.id)),
      ]
        .filter((item) => item.userId === selectedUser)
        .sort((a, b) => b.completedAt - a.completedAt);
      setRecords(merged);
      if (localFailed) setNotice(undefined);
    } catch {
      setNotice(
        localFailed
          ? "历史暂时无法读取。"
          : "云端记录暂时无法更新，当前显示本机记录。",
      );
    }
  }, [identity, selectedUser]);
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
        <div className="historyUserTabs">
          <button
            className={selectedUser === "fish" ? "selected" : ""}
            onClick={() => setSelectedUser("fish")}
          >
            🐟 小鱼{identity.role !== "fish" && "（只读）"}
          </button>
          <button
            className={selectedUser === "cat" ? "selected" : ""}
            onClick={() => setSelectedUser("cat")}
          >
            🐱 小猫{identity.role !== "cat" && "（只读）"}
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {records.length ? (
        <div>
          {records.map((record) => (
            <article className="matchHistoryRow" key={record.id}>
              <span>{stamp(record.completedAt)}</span>
              <strong>{(record.totalTimeMs / 1000).toFixed(1)}秒</strong>
              {record.trainingSource === "pk" && <small>PK</small>}
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
