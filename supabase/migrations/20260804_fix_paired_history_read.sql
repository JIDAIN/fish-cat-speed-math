-- 修复第二阶段配对对象 completed 历史读取。
-- 可在 Supabase SQL Editor 安全重复执行；不会删除或改写既有数据。

alter table public.pairs enable row level security;

-- completed_training_sessions 的读取策略会在 exists 子查询中访问 pairs。
-- 配对双方仅可读取包含自身 UUID 的那一条配对关系，未配对账号不能
-- 观察或借此读取任何 completed 训练。
drop policy if exists "read own pair" on public.pairs;
create policy "read own pair" on public.pairs
  for select to authenticated
  using (fish_id = auth.uid() or cat_id = auth.uid());

-- Recreate the dependent policy so its intended paired-membership check is
-- explicit and uses the now-authorized pairs row.
drop policy if exists "read paired completed sessions" on public.completed_training_sessions;
create policy "read paired completed sessions" on public.completed_training_sessions
  for select to authenticated using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.pairs p
      where (p.fish_id = auth.uid() and p.cat_id = owner_id)
         or (p.cat_id = auth.uid() and p.fish_id = owner_id)
    )
  );

-- Read-only post-run diagnostic. Expected after the reported scenario:
-- one pair and at least one completed session; no data is changed here.
select
  (select count(*) from public.pairs) as fixed_pairs,
  (select count(*) from public.completed_training_sessions) as completed_sessions;
