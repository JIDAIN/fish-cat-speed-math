"use client";

import { FormEvent, useState } from "react";
import { CloudIdentity, signIn, signOut, supabase } from "@/lib/cloud";

export function AccountPanel({
  identity,
  onIdentity,
  authResolved,
}: {
  identity?: CloudIdentity;
  onIdentity: (identity?: CloudIdentity) => void;
  authResolved: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState(false);
  if (!authResolved)
    return <div className="accountPanel accountLoading">正在确认账号状态…</div>;
  if (!supabase())
    return <p className="hint">云端同步尚未配置，本地训练可正常使用。</p>;
  if (identity)
    return (
      <div className="accountPanel accountCompact">
        <span>
          当前：{identity.role === "fish" ? "🐟 小鱼" : "🐱 小猫"} ·
          已绑定同步账号
        </span>
        <small>{identity.email}</small>
        <button
          onClick={() =>
            signOut()
              .then(() => onIdentity())
              .catch(() => setError("退出失败"))
          }
        >
          退出
        </button>
        {error && <small role="alert">{error}</small>}
      </div>
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError(undefined);
      onIdentity(await signIn(email, password));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
    }
  };
  if (!expanded)
    return (
      <div className="accountPanel accountCompact">
        <span>未登录，仅本地保存</span>
        <button onClick={() => setExpanded(true)}>登录同步账号</button>
      </div>
    );
  return (
    <form className="accountPanel accountLogin" onSubmit={submit}>
      <label>
        <span>邮箱</span>
        <input
          aria-label="登录邮箱"
          autoComplete="email"
          placeholder="邮箱"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        <span>密码</span>
        <input
          aria-label="登录密码"
          autoComplete="current-password"
          placeholder="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button type="submit">登录同步账号</button>
      <button type="button" onClick={() => setExpanded(false)}>
        暂不登录
      </button>
      {error && <small role="alert">{error}</small>}
    </form>
  );
}
