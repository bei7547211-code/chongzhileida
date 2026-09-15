# 重置雷达（Reset Radar）

面向 Codex 用户的 Reset 状态、24 小时信号与提醒网站项目。

## 项目目录

```text
重置雷达/
├── README.md      项目入口与说明
├── docs/          产品需求文档
├── design/        桌面端、移动端和产品蓝图 SVG
└── website/       可独立开发、构建和部署的网站工程
```

## 当前阶段

- 已确定 MVP 核心：当前状态、24 小时雷达、信号依据、最近事件、邮件提醒。
- 已完成桌面端、移动端和产品蓝图 SVG。
- 已完成第一个最小功能：从手动数据读取并展示 Reset 状态、24 小时信号分数和判断依据。
- 已完成动态信号台：雷达扫描、证据切换、自动巡检演示和状态分享。
- 已完成 Tibo 公告流：最近重置、统计卡、26 周热力图、类型筛选和 X 原帖跳转。
- 邮件订阅已从当前版本移除，暂不引入数据库和发信成本。
- 已加入核心规则自动测试，测试与正式构建均通过。
- 尚未接入真实数据和自动抓取。
- 网站已调整为 Vercel 原生支持的 Next.js 生产构建。
- 已完成 GrokBot 数据入口、作者校验、reset 分类、ID 去重、数据守卫和 CI。
- 已预留飞书审计接口，每天 11:00 的巡检结果、故障和待判断问题可发送到飞书群。
- GrokBot 云端 Routine 仍需按 `docs/GROKBOT-MONITOR-MVP.md` 首次登录并手动验收后才能开启。

## 后续开发入口

网站代码位于 `website/`。进入该目录后：

```bash
npm run dev
```

最新开发说明见 `docs/DEVELOPMENT-MVP-Tibo公告流-v0.4.md`。
GrokBot 监控与验收手册见 `docs/GROKBOT-MONITOR-MVP.md`。
自动执行边界和人工决策规则见 `docs/OPERATIONS-REVIEW-POLICY.md`。

在 Vercel 从 GitHub 导入本仓库时，请将 **Root Directory** 设为 `website`，
其余构建选项保持自动检测即可。邮件提醒暂不在当前范围内。
