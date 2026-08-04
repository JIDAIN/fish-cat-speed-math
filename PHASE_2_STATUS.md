# 第二阶段：最小 Supabase 双人同步

- 使用公开 URL 与 publishable key 初始化客户端；不使用 service role 或其他高权限凭据。
- 数据库迁移以固定邮箱映射 `fish` / `cat`，RLS 只允许本人及唯一配对对象读取完成训练；受控 RPC 将 completed 冻结题组按 session UUID 幂等写入。
- 本地训练优先保存。云端失败不会删除 IndexedDB 数据，且结果页可以重试同步。
- 新训练保存 Auth 账号归属；登录后身份锁定页面鱼猫视觉选择。账号切换不会自动认领或上传其他账号数据。
- 旧本地历史默认未归属。登录后必须明确“合并到当前账号”或“丢弃本地历史”；展示与趋势仅合并当前账号明确归属的本地记录和去重后的允许云端记录。

## 部署前条件

1. 在 Supabase SQL Editor 执行 `supabase/migrations/20260804_minimal_pair_sync_repair.sql`。
2. 在 Vercel 配置 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，然后重新部署。
3. 两个指定邮箱均应在 Supabase Auth 中创建密码账号。
