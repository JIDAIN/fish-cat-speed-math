"use client";

import { FormEvent, useState } from "react";
import { CloudIdentity, signIn, signOut, supabase } from "@/lib/cloud";

export function AccountPanel({
  identity,
  onIdentity,
}: {
  identity?: CloudIdentity;
  onIdentity: (identity?: CloudIdentity) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  if (!supabase())
    return <p className="hint">云端同步尚未配置，本地训练可正常使用。</p>;
  if (identity)
    return (
      <div className="accountPanel">
        <span>
          已登录：{identity.role === "fish" ? "🐟" : "🐱"} {identity.email}
        </span>
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
  return (
    <form className="accountPanel" onSubmit={submit}>
      <input
        aria-label="登录邮箱"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        aria-label="登录密码"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">登录同步账号</button>
      {error && <small role="alert">{error}</small>}
    </form>
  );
}
