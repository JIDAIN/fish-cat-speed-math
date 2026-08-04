# 第二阶段：最小 Supabase 双人同步

> 完成状态（2026-08-04）：最小双人同步已可在生产版本使用；本文件只描述当前范围，不代表已实现 PK、实时订阅或 active 跨设备同步。

- 使用公开 URL 与 publishable key 初始化客户端；不使用 service role 或其他高权限凭据。
- 数据库迁移以固定邮箱映射 `fish` / `cat`，RLS 只允许本人及唯一配对对象读取完成训练；受控 RPC 将 completed 冻结题组按 session UUID 幂等写入。
- 本地训练优先保存。completed 训练会在本地保存成功后尝试一次上传；结果页显示同步中、已同步、未同步或同步失败，历史页为当前账号的未同步/失败记录提供手动重试。云端失败不会删除 IndexedDB 数据；不建立自动补传队列。
- active 未完成训练永不上传，只按 `ownerAccountId`（或独立的未登录本地范围）保存在当前浏览器。页面隐藏、失焦、冻结、离开和恢复读取都会暂停计时；每个账号及未登录范围各自最多保留一条 active，会话不会因账号切换被认领、展示或删除。
- 新训练保存 Auth 账号归属；登录后身份锁定页面鱼猫视觉选择。账号切换不会自动认领或上传其他账号数据。
- 旧本地历史默认未归属。登录后必须明确“合并到当前账号”或“丢弃本地历史”；展示与趋势仅合并当前账号明确归属的本地记录和去重后的允许云端记录。

## 部署前条件

1. 在 Supabase SQL Editor 执行 `supabase/migrations/20260804_minimal_pair_sync_repair.sql`。
2. 在 Vercel 配置 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，然后重新部署。
3. 两个指定邮箱均应在 Supabase Auth 中创建密码账号。

## 配对读取修复

- 执行 `supabase/migrations/20260804_fix_paired_history_read.sql`，为配对双方增加只读自身配对行的 RLS 策略。它修复 completed 读取策略内部无法识别配对关系的问题，不改写现有训练。
