# 第二阶段：最小 Supabase 双人同步

> 完成状态（2026-08-04）：最小双人同步与异步 PK 第一版已可部署；active 仍不跨设备同步，不包含实时订阅、多人或排行榜。

- 使用公开 URL 与 publishable key 初始化客户端；不使用 service role 或其他高权限凭据。
- 数据库迁移以固定邮箱映射 `fish` / `cat`，RLS 只允许本人及唯一配对对象读取完成训练；受控 RPC 将 completed 冻结题组按 session UUID 幂等写入。
- 本地训练优先保存。completed 训练会在本地保存成功后尝试一次上传；结果页显示同步中、已同步、未同步或同步失败，历史页为当前账号的未同步/失败记录提供手动重试。云端失败不会删除 IndexedDB 数据；不建立自动补传队列。
- active 未完成训练永不上传，只按 `ownerAccountId`（或独立的未登录本地范围）保存在当前浏览器。页面隐藏、失焦、冻结、`pagehide`、返回/前进导航、关闭/跳转以及恢复读取都会暂停计时；BFCache 恢复不会补计离开间隔。每个账号及未登录范围各自最多保留一条 active，会话不会因账号切换被认领、展示或删除。
- 新训练保存 Auth 账号归属；登录后身份锁定页面鱼猫视觉选择。账号切换不会自动认领或上传其他账号数据。
- 旧本地历史默认未归属。登录后必须明确“合并到当前账号”或“丢弃本地历史”；展示与趋势仅合并当前账号明确归属的本地记录和去重后的允许云端记录。
- 异步 PK 只从已完成普通训练结算页发起，并冻结完整题组和发起人成绩；指定配对对象完成同题同序训练后，双方个人训练照常进入长期历史，PK 页只展示按最终完成时间计算的近7日结果。红色首页气泡代表未完成挑战，蓝色代表对方新完成但尚未进入 PK 页接收的结果。详细流程、分页、RLS、离线边界和验收见 [PK_ASYNC.md](./PK_ASYNC.md)。

## 部署前条件

1. 在 Supabase SQL Editor 执行 `supabase/migrations/20260804_minimal_pair_sync_repair.sql`。
2. 在 Vercel 配置 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，然后重新部署。
3. 两个指定邮箱均应在 Supabase Auth 中创建密码账号。
4. 执行 `supabase/migrations/20260804_async_pk.sql`；它可重复执行，创建 PK 挑战、结果已读与受控 RPC，不删除既有用户、配对或训练。

## 配对读取修复

- 执行 `supabase/migrations/20260804_fix_paired_history_read.sql`，为配对双方增加只读自身配对行的 RLS 策略。它修复 completed 读取策略内部无法识别配对关系的问题，不改写现有训练。

# 页面恢复与账号呈现补充

页面刷新、浏览器导航、账号三态和移动端首页原则见 [NAVIGATION_RECOVERY.md](./NAVIGATION_RECOVERY.md)。本地 active 训练只在原账号、原浏览器恢复；已完成记录及 PK 仍按既有同步边界处理。
