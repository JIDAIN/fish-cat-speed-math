# Numera AI 项目规则

本文件是 `JIDAIN/numera` 的 AI / 自动化开发入口。项目专属执行工作流的唯一正文位于：

`.agents/skills/numera-maintainer/SKILL.md`

开始任何代码、UI、数据或文档修改前，必须先阅读本文件和该 Skill。

## 1. 当前事实源

优先级：

```text
当前代码 / 测试
→ PROJECT_STATUS.md 顶部当前正式状态
→ 当前专项文档
→ README.md 当前入口说明
→ README / 阶段文档中的历史快照
```

`README.md` 含较早“纯本地 MVP / 未接 Supabase”等历史段落，不能据此覆盖当前 Supabase Auth、completed 云同步、配对只读和异步 PK 等正式状态。

## 2. 项目身份

正式中文名：数感；英文名：Numera；小名：算算。

当前技术栈以 `package.json` 为准：Next.js 15、React 19、TypeScript、IndexedDB、Supabase、Vitest / Testing Library、Recharts。

## 3. 必须保护的核心语义

- completed 训练本地落盘后幂等同步；active 只留当前浏览器；
- Auth 身份决定训练归属，不能由 UI 临时切换改写；
- 配对对象历史只读；
- 计时只算有效训练时间，离开/隐藏/锁屏/恢复不补计；
- 题目生成、结构配额和判题逻辑只在正式生成器 / 规则层维护，不复制进 UI；
- 评级、趋势、历史统计、PK 各有独立长期语义，修改前读对应专项文档；
- 草稿纸不识别、不上传、不持久化。

## 4. 修改纪律

- 只修改用户要求所必需的范围；
- 不顺手重构无关生成器、会话或 storage；
- 项目旧兼容逻辑不得仅因“看起来多余”就删除；
- 先定义可验证成功标准，再实现；
- UI 优化不得改变题目、判题、计时、数据归属、统计或 PK 语义。

## 5. 验证

有意义的代码变更应尽量执行：

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run build
```

无法运行的检查要明确说明。测试通过不等于手机视觉已验证。

## 6. 文档入口

- 当前状态：`PROJECT_STATUS.md`
- 逻辑审计：`PROJECT_LOGIC_AUDIT.md`
- 后续计划：`DEVELOPMENT_PLAN.md`
- 评级：`RATING_STANDARDS.md`
- 历史统计：`HISTORY_REPORTING.md`
- 异步 PK：`PK_ASYNC.md`
- 导航 / 恢复：`NAVIGATION_RECOVERY.md`
- 数据导出：`DATA_EXPORT.md`

具体任务的完整执行协议以 `.agents/skills/numera-maintainer/SKILL.md` 为准。
