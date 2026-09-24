# Reset Relay · 确认稿落地与三平台接入

日期：2026-09-24。状态：本地开发与验收完成，未提交或推送 GitHub，未触发线上部署。

## 页面

- 首页：暖色纸感、三张原创雕刻人物卡、明确分类导航、近期记录和精选副业入口。
- Codex / Claude / Grok：同一套独立页面与数据模型，公开状态、发布时间、最近成功采集时间、原帖截图、英文原文、历史筛选、官方动态、RSS、分享。
- 工具：Token 成本估算、官方个人额度入口、RSS 与三平台分享卡。校验负值、非整数、空值、过大输入和非有限数字。
- 知识库：分类与搜索、展开解答、无结果提示、本设备祈愿计数；保留旧版存储键。
- 副业列表、详情、体验邀请、分享弹窗：统一暖色视觉，筛选返回保留，少量结果时收起大侧栏海报，避免大块空白。
- 手机：折叠菜单、单列卡片、表格仅在容器内横向滑动、弹窗适配视口。

## 三平台数据流程

原有 Mac 定时任务入口不变：website/scripts/run-tibo-monitor.mjs。
本次将 Claude/Grok 采集加入同一运行链：

读取官方公开动态 → 作者白名单与 ID 去重 → 明确公告入库 / 模糊信息私有待审 → 数据校验 → 测试 → 生产构建 → 发布模式才提交推送 → 原有飞书通道通知。

- Codex：Tibo 原有流程继续保留。
- Claude：claudeai、ClaudeDevs。已核验 claudeai 自回复宣布可保存、自行使用的重置次数；ClaudeDevs 转述同一事件已去重拒绝。
- Grok：grok、bot。已核验历史公告仅适用于 Grok Bot，不代表 Chat、Build 或所有账户。
- 普通动态不会进入重置历史或 RSS。原帖被编辑时撤回旧的公开判断，重新进入待审队列。
- 失败保留历史记录，不刷新成功采集时间；页面明确显示失败或过期提示。
- 人物插画不构成官方背书。本站不读取个人账户凭证或额度。
- 私有审核文件保存在 Mac 的 .reset-radar 目录，不进入网站公开包。

来源：

- https://x.com/claudeai/status/2102435538120691886
- https://x.com/ClaudeDevs/status/2102438800836489554
- https://x.com/bot/status/2096303514230423629
- 采集使用与原 Codex 相同的 FxTwitter 公共镜像，依赖该第三方来源可用性；作者与原帖另外核验。

## 截图与分享的边界

- Claude/Grok 截图来自实际打开的 X 原帖页面，仅截对应帖子，不包含登录账户侧栏。
- 当前截图为浏览器中文显示，页面和导出图片均注明「以英文原文为准」，原文可展开查看。
- 证据注册表 website/data/provider-evidence.json 将截图绑定到原帖 ID、URL 和正文内容哈希。编辑后的公告不能继续套用旧图。
- 新公告若尚未有匹配截图，保留原文与来源，但禁用证据卡导出；不生成仿制推文。
- 下载为 1080 像素宽 PNG，高度适配真实原帖。二维码保留原站点及分享来源参数。
- 系统原生分享仍取决于用户设备支持；已验证下载，不声称已验证微信客户端内转发。

## 验收记录

- 完整本地巡检：189 条动态，6 条新普通动态，0 条新明确重置；Claude/Grok 二次采集无重复入库。关闭外部通知，仅写本地。
- 56 项自动化测试通过。
- Next.js 生产构建、数据校验、12 项关键样式检查、私有信息防泄漏检查通过。
- 本次新增/修改的核心功能文件定向 lint 通过。全仓 lint 尚有既有 UI 模板与旧测试告警，未把它宣称为全仓零告警。
- 桌面和 390px 手机检查：首页、三个平台、工具、知识库、副业、体验页均无整页横向溢出，内容图片可加载。
- 手动验收：平台空筛选不再残留其他记录的证据；手机菜单；副业分类→详情→返回保留分类；知识库空搜索；祈愿刷新持久化（测试后恢复原计数）；四个 RSS 地址正常。
- 分享图片实际下载；二维码经本机识别解码，指向 https://www.resetrelay.com/?utm_source=share_card&utm_medium=wechat_moments&utm_campaign=verified_reset 。
- 副业详情残留的深色统计背景已替换为浅色。

## 本地操作

- 预览：http://localhost:3001/
- 只检查新增来源：npm run monitor:providers
- 三平台完整只读检查：npm run monitor:tibo
- 本地更新且不发送飞书：node scripts/run-tibo-monitor.mjs --write --no-notify
- 审核队列：npm run review:providers；批准需明确 provider、id、kind、scope、reason，并重新核验原帖正文。
- 发布仍使用原 monitor:tibo:publish；要求代码已提交、main 与远端一致，避免覆盖手工修改。

当前有本次尚未提交的代码，因此定时自动发布会安全拒绝。需要先审阅并同步 GitHub，之后才可按现有发布链继续运行。此次没有改动定时频率，也没有发送真实飞书消息。

## 插画资产与提示词

使用内置 image_gen，根据已确认首页设计生成三张项目正式插画，再转换为适于网页传输的 JPEG。旧素材保留，不覆盖。

- website/public/images/platform-cards/codex-engraving-v2.jpg
- website/public/images/platform-cards/claude-engraving-v2.jpg
- website/public/images/platform-cards/grok-engraving-v2.jpg

公共提示词：Use case: style-transfer. Reference image: approved website design. Produce ONE production-ready standalone portrait illustration asset for the platform card, closely matching the corresponding portrait in the approved design. Preserve finely crosshatched antique engraving, premium bookplate texture, cream paper, botanical ornamental edge. Portrait chest-up, face large, centered in portrait 4:5 image. Include thin ornamental border near edges, no blank header, no text, no letters, no UI, no stats, no checkmarks, no watermark, no religious costume or gold coins. Editorial illustration, not a photo or endorsement. Output a single portrait, not a website mockup.

三张主体补充：

- Codex：Tibo, smiling dark wavy-haired young man in modern dark knit sweater; warm gold/ochre engraved architecture and foliage.
- Claude：Dario Amodei, curly hair and round glasses, modern knit sweater; terracotta copper/sepia engraving and architecture.
- Grok：Elon Musk looking thoughtfully upward, modern dark jacket; monochrome silver-gray engraving and architectural arches.

价格快照核对来源：https://developers.openai.com/api/docs/pricing （2026-09-24，标准短上下文价格，非实时账单）。
