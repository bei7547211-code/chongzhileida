# GrokBot 监控 Tibo——MVP 接入方案

## 结论

GrokBot 适合做低成本 MVP 的“眼睛”：它在云电脑中定时打开
Tibo 的 X 主页，发现新帖子后将原文交给本项目的确定性入库脚本。

GrokBot 不负责随意改页面，也不能根据自己的猜测编造公告。

```text
GrokBot Routine（每天 11:00，Asia/Shanghai）
  → 打开 @thsottiaux 主页和回复页
  → 只取得新帖子的 ID / 原文 / 时间 / URL
  → npm run ingest:tibo
  → 作者校验 + reset 规则分类 + ID 去重
  → 数据校验 + 测试 + 正式构建
  → 只允许修改 reset-feed.json
  → 生成每日审计报告，并按需发送飞书
  → 有新公告时推送 GitHub main
  → Vercel 自动上线
```

## 第一次配置

1. 安装 Grok Bot，使用你的 Cursor 或 SuperGrok 账号登录；是否可用以账户页面为准。
2. 创建一个 Bot，名称设为 `Tibo Reset Watcher`。
3. 打开 Bot 的云电脑，由你亲自完成 X 和 GitHub 登录。不要把密码、验证码发给 Bot。
4. 让 Bot 克隆私有仓库 `bei7547211-code/chongzhileida`。
5. 先手动运行一次下方指令，确认它只建立基线，不会把旧帖子重复推送。
6. 手动验收通过后，再将它保存为每天北京时间 11:00 执行的 Routine。

在正式连接 Routine 前，可在 `website/` 目录运行下面的无写入演练：

```bash
npm run ingest:tibo -- scripts/fixtures/tibo-reset.sample.json --dry-run
```

只有看到 `DRY_RUN INGESTED ... AS full` 才表示入口可用；该命令不会修改正式数据。

## 可直接交给 GrokBot 的指令

```text
你是 Tibo Reset Watcher，唯一任务是监控 X 账号 @thsottiaux 的公开帖子和回复，
将与 Codex usage reset、quota reset、banked reset、reset card、usage limit
相关的新帖子安全收录到重置雷达。

固定工作目录是私有仓库 bei7547211-code/chongzhileida。
每次开始先 git pull --ff-only origin main。使用云电脑中的持久文件
~/tibo-reset-watcher-state.json 保存 lastSeenPostId，不要用对话记忆代替这个文件。
如果文件不存在，将当前最新的 Tibo 帖子 ID 写入文件作为基线，然后安静结束；
首次运行不回填旧帖子。

只能以 https://x.com/thsottiaux 和
https://x.com/thsottiaux/with_replies 中明确显示为 @thsottiaux 发布的内容为数据源。
不使用搜索摘要、转述、截图 OCR 推测或其他账号的回复作为公告。

对每条比 lastSeenPostId 更新的帖子：
1. 核对作者、状态 ID、完整原文、发布时间和原帖 URL。
2. 创建临时 JSON 文件，字段只包含 id、authorHandle、publishedAt、text、url。
3. 在 website 目录运行 npm run ingest:tibo -- <临时 JSON 路径>。
4. 如果输出 IRRELEVANT 或 DUPLICATE，不修改、不提交公告数据；如果输出
   NEEDS_JUDGMENT，不自动入库，在当日审计中附原帖并提出判断题。
5. 如果输出 INGESTED，依次运行 npm run validate:data、npm test、npm run build。
6. 然后运行 npm run guard:grokbot。只有输出 SAFE 才能继续。
7. 回到仓库根目录，只 git add website/data/reset-feed.json，提交信息为
   data: ingest Tibo post <ID>，并 git push origin main。
8. 推送成功后检查 https://www.resetrelay.com 返回 200，并记录新公告已上线。
9. 所有新帖子检查完成后，无论是否与 reset 相关，都要将已确认的最新帖子 ID
   写入 ~/tibo-reset-watcher-state.json。这个本地状态文件不推送 GitHub。
10. 无论结果是无新内容、成功入库、需要判断还是运行失败，都要创建临时审计 JSON，
    在 website 目录运行 npm run audit:grokbot -- <临时审计 JSON 路径>。
    每次只报告检查数量、结果、异常和明确需要用户判断的问题，不写冗长过程。

安全边界：
- 不得修改 reset-feed.json 以外的仓库文件。
- 不得使用 force push、不得删除历史、不得改网站样式。
- 不得在 X 上发帖、回复、点赞或关注。
- 页面无法读取、登录过期、出现验证码或推送失败时，停止并报告，不要绕过。
- 不确定作者、无法取得原文、语义介于“讨论 reset”和“确认 reset”之间时，
  不自动入库；审计状态设为 attention，并提出一个可以直接回答的判断题。
- X 登录失效、验证码、数据校验失败、测试失败、GitHub 推送失败或线上检查失败时，
  审计状态设为 error，写清失败阶段。飞书发送本身失败时，在 GrokBot 任务中报警。
```

## 每日审计与飞书接口

每次运行都保存在 GrokBot 云电脑的：

```text
~/.reset-radar/grokbot-audit.jsonl
```

飞书接口是可选的，不配置也不会影响监控。需要启用时，在飞书群中创建“自定义机器人”，
复制 Webhook 地址，然后由你亲自在 GrokBot 云电脑中将地址写入下面这个文件：

```text
~/.reset-radar/feishu-webhook-url
```

也可以使用云电脑环境变量 `FEISHU_WEBHOOK_URL`。Webhook 等同于发送凭证，不能提交到
GitHub、不能放进网站前端，也不要出现在截图中。

审计 JSON 示例：

```json
{
  "startedAt": "2026-09-16T02:59:00.000Z",
  "finishedAt": "2026-09-16T03:01:00.000Z",
  "status": "attention",
  "checkedPosts": 8,
  "newPosts": 1,
  "ingestedPostIds": [],
  "summary": "发现一条含糊的额度讨论，未自动入库。",
  "judgmentNeeded": [
    {
      "question": "这条推文是否应视为重置公告？",
      "reason": "提到了 quota，但没有明确表示额度已经重置。",
      "url": "https://x.com/thsottiaux/status/2100000000000000000"
    }
  ]
}
```

正式接入飞书前，可先运行无发送、无落盘演练：

```bash
npm run audit:grokbot -- scripts/fixtures/grokbot-audit.sample.json --dry-run
```

## GrokBot 交给入库脚本的 JSON

```json
{
  "id": "2100000000000000000",
  "authorHandle": "@thsottiaux",
  "publishedAt": "2026-09-15T12:00:00.000Z",
  "text": "Reset all propagated.",
  "url": "https://x.com/thsottiaux/status/2100000000000000000"
}
```

## 验收标准

- 不相关帖子不改任何文件。
- 重复帖子 ID 不会二次入库。
- 非 `@thsottiaux` 作者和伪造 URL 直接拒绝。
- GrokBot 只能修改 `website/data/reset-feed.json`。
- 入库后数据校验、自动测试和 Next.js 生产构建全部通过。
- GitHub `main` 更新后，Vercel 自动更新正式域名。
- 每天北京时间 11:00 仅运行一次，并为每次运行生成审计记录。
- 审计报告能区分正常、已更新、需要判断和运行失败。

## 已知边界

- GrokBot 依赖 X 网页和登录会话，不如官方 X API 稳定。
- X 页面改版、账号掉线或出现人机验证时，需要人工恢复。
- 每天 11:00 运行一次，成本低、噪音少，但 Tibo 在 11:00 之后发布的公告会在次日才发现。
- 当用户量和可靠性要求提高后，应迁移到 X API Filtered Stream Webhook。
