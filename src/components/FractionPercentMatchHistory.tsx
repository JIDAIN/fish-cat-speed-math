"use client";
import { useCallback, useEffect, useState } from "react";
import { CloudIdentity } from "@/lib/cloud";
import {
  checkFractionPercentMatchCloudCapability,
  readMatchHistory,
  syncOwnedMatchRecord,
} from "@/lib/fraction-percent-match-cloud";
import { FractionPercentMatchRecord } from "@/lib/fraction-percent-match";
import {
  readMatchRecords,
  saveMatchRecord,
} from "@/lib/fraction-percent-match-storage";
import { submitMatchPKResult } from "@/lib/fraction-percent-match-pk-cloud";

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
  const [syncingRecordIds, setSyncingRecordIds] = useState<Set<string>>(() => new Set());
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const load = useCallback(async (preserveNotice = false) => {
    if (!preserveNotice) setNotice(undefined);
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
  const persistRetry = useCallback(async (record: FractionPercentMatchRecord) => {
    const result = await syncOwnedMatchRecord(record, identity?.id);
    if (!result.ok) {
      const failed = { ...record, syncStatus: "failed" as const };
      await saveMatchRecord(failed);
      return result;
    }
    let saved = result.record;
    if (saved.trainingSource === "pk" && saved.pkChallengeId) {
      try {
        await submitMatchPKResult(saved.pkChallengeId, saved.id);
        saved = { ...saved, pkSyncStatus: "synced" };
      } catch {
        saved = { ...saved, pkSyncStatus: "failed" };
      }
    }
    await saveMatchRecord(saved);
    return saved.pkSyncStatus === "failed"
      ? { ok: false as const, reason: "server" as const }
      : { ok: true as const, record: saved };
  }, [identity?.id]);
  const retry = async (record: FractionPercentMatchRecord) => {
    setSyncingRecordIds((old) => new Set(old).add(record.id));
    try {
      const result = await persistRetry(record);
      setNotice(result.ok ? "已同步到云端。" : "云端同步失败，记录仍保存在本机。");
      await load(true);
    } finally {
      setSyncingRecordIds((old) => { const next = new Set(old); next.delete(record.id); return next; });
    }
  };
  const retryAll = async () => {
    const candidates = records.filter((record) => record.ownerAccountId === identity?.id && (record.syncStatus === "failed" || record.syncStatus === "not_synced"));
    if (!candidates.length || bulkSyncing) return;
    setBulkSyncing(true);
    try {
      const capability = await checkFractionPercentMatchCloudCapability();
      if (capability !== "ready") {
        setNotice(capability === "base_not_deployed" || capability === "base_rpc_not_deployed" ? `消消乐云端功能尚未完成数据库升级，${candidates.length}条记录仍安全保存在本机。` : "云端暂时不可用，记录仍安全保存在本机。");
        return;
      }
      const results = await Promise.all(candidates.map(persistRetry));
      const succeeded = results.filter((result) => result.ok).length;
      await load(true);
      setNotice(`成功同步 ${succeeded} 条，失败 ${candidates.length - succeeded} 条`);
    } finally { setBulkSyncing(false); }
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
      {identity && selectedUser === identity.role && records.some((record) => record.ownerAccountId === identity.id && (record.syncStatus === "failed" || record.syncStatus === "not_synced")) && <button disabled={bulkSyncing} onClick={() => void retryAll()}>{bulkSyncing ? "正在同步…" : "重试全部同步"}</button>}
      {records.length ? (
        <div>
          {records.map((record) => (
            <article className="matchHistoryRow" key={record.id}>
              <span>{stamp(record.completedAt)}</span>
              <strong>{(record.totalTimeMs / 1000).toFixed(1)}秒</strong>
              {record.trainingSource === "pk" && <small>PK</small>}
              {record.syncStatus !== "synced" && identity && record.ownerAccountId === identity.id && (
                <button disabled={bulkSyncing || syncingRecordIds.has(record.id)} onClick={() => void retry(record)}>{syncingRecordIds.has(record.id) ? "正在同步…" : "重试同步"}</button>
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
