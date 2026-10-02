import { useState } from "react";
import { data, redirect, Link, useLoaderData, useRevalidator, type LoaderFunctionArgs } from "react-router";
import { PROVIDERS, eventStatus, type Provider, type ResetEvent, type ResetRelaySnapshot } from "@aihot/contracts/reset-relay";
import { loadOr404 } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import "../features/relay/relay.css";

const platforms = {
  codex: { name: "Codex", company: "OpenAI", mark: "C", source: "Tibo · 公开公告", color: "teal" },
  claude: { name: "Claude", company: "Anthropic", mark: "✳", source: "Claude · 公开公告", color: "clay" },
  grok: { name: "Grok", company: "xAI", mark: "G", source: "Grok · 公开公告", color: "blue" },
};
const dt = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

export async function loader({ request, params }: LoaderFunctionArgs) {
  // React Router client transitions request .data URLs; these are transport paths, not page routes.
  const path = new URL(request.url).pathname.replace(/\.data$/, "").replace(/^\/_(root)?$/, "/");
  if (params.provider && !PROVIDERS.includes(params.provider as Provider)) throw data(null, { status: 404 });
  if (path === "/codex-reset") throw redirect("/monitor/codex");
  if (path.startsWith("/platform/")) throw redirect("/monitor/" + params.provider);
  const snapshot = await loadOr404<ResetRelaySnapshot>("/api/site/reset-relay", { signal: request.signal });
  const selected = params.eventId ? snapshot.events.find(e => e.id === params.eventId) : null;
  if (params.eventId && !selected) throw data(null, { status: 404 });
  return data({ snapshot, path, provider: undefined as Provider | undefined, selected }, { headers: { "Cache-Control": "no-store" } });
}
export function headers() { return { "Cache-Control": "no-store" }; }
export function meta() { return pageMeta({ title: "重置追踪 · 本机迁移预览", path: "/", noindex: true }); }

function Badge({ kind }: { kind: ResetEvent["kind"] }) {
  return <span className={"rr-badge rr-" + kind}><span aria-hidden="true">●</span> {kind === "signal" ? "待确认" : kind === "banked" ? "重置卡" : "已确认"}</span>;
}
function Evidence({ event }: { event: ResetEvent }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(event.title + "\n" + event.summary + "\n原帖：" + event.sourceUrl + "\n公开公告不代表个人额度。");
      setMessage("已复制，包含原帖链接");
    } catch { setMessage("复制未成功，请直接打开原帖"); }
  }
  return <article className="rr-evidence">
    <div className="rr-row"><Badge kind={event.kind} /><span className="rr-muted">{dt(event.publishedAt)} · 北京时间</span></div>
    <h1>{event.title}</h1><p>{event.summary}</p>
    <div className="rr-scope"><b>适用范围</b><span>{event.scope}</span></div>
    <h2>原帖文字</h2><blockquote>{event.text}</blockquote>
    <p className="rr-muted">旧站核验时间：{dt(event.verifiedAt)}。本条为迁移记录，尚未重新核对后续动态。</p>
    <div className="rr-actions"><a className="rr-button primary" href={event.sourceUrl} target="_blank" rel="noopener noreferrer">打开官方原帖 ↗</a><button className="rr-button" onClick={copy}>复制分享文字</button></div>
    <p role="status" className="rr-muted">{message}</p>
  </article>;
}
export function Feed({ events, compact = false, monitor = false }: { events: ResetEvent[]; compact?: boolean; monitor?: boolean }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const visible = events.filter(e => (kind === "all" || e.kind === kind) && (e.title + " " + e.summary + " " + e.scope + " " + platforms[e.provider].name).toLowerCase().includes(query.toLowerCase().trim()));
  return <section className="rr-panel">
    <div className="rr-panel-head"><div><span className="rr-kicker">PUBLIC RECORDS</span><h2>{compact ? "最近收录" : "公开记录"}</h2></div><span className="rr-muted">{visible.length} 条记录</span></div>
    {!compact && <div className="rr-filters"><input aria-label="搜索公开记录" placeholder="搜索平台、公告或适用范围…" value={query} onChange={e => setQuery(e.target.value)} />{!monitor && <select aria-label="按公告类型筛选" value={kind} onChange={e => setKind(e.target.value)}><option value="all">全部类型</option><option value="signal">待确认</option><option value="full">额度重置</option><option value="banked">重置卡</option></select>}</div>}
    {monitor && <div className="rm-kind-tabs" role="group" aria-label="按公告类型筛选">{[["all", "全部"], ["signal", "预告"], ["full", "已确认"], ["banked", "重置卡"]].map(([value, label]) => <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}<span aria-live="polite">{visible.length} 条</span></div>}
    {(compact ? visible.slice(0, 4) : visible).map(event => <Link className="rr-event" key={event.id} to={"/reset-events/" + encodeURIComponent(event.id)}>
      <span className={"rr-mark small " + platforms[event.provider].color}>{platforms[event.provider].mark}</span>
      <div className="rr-event-body"><div className="rr-row"><span className="rr-provider">{platforms[event.provider].name}</span><Badge kind={event.kind} /></div><h3>{event.title}</h3><p>{event.summary}</p><span className="rr-muted">{dt(event.publishedAt)} · 查看依据 ↗</span></div>
    </Link>)}
    {!visible.length && <div className="rr-empty">没有符合条件的记录。试试其他关键词或类型。</div>}
    {compact && <Link className="rr-all" to="/history">查看全部历史记录 <span>→</span></Link>}
  </section>;
}

export default function Home() {
  const { snapshot, provider, selected, path } = useLoaderData<typeof loader>();
  const refresh = useRevalidator();
  const cases = path === "/side-hustles";
  const guide = path === "/guide";
  const overview = path === "/";
  const shown = provider ? snapshot.events.filter(e => e.provider === provider) : snapshot.events;
  return <div className="rr">
    <header className="rr-top"><Link to="/" className="rr-mobile-brand">◎ 重置雷达</Link><span className="rr-breadcrumb">RESET RELAY <span>/</span> {cases ? "精选副业" : guide ? "使用指南" : provider ? platforms[provider].name : selected ? "公告详情" : "重置追踪"}</span><button className="rr-refresh" onClick={() => refresh.revalidate()} disabled={refresh.state !== "idle"}>{refresh.state !== "idle" ? "读取中…" : "↻ 刷新记录"}</button></header>
    <div className="rr-migration"><span>迁移预览</span><p>数据快照截至 {dt(snapshot.generatedAt)}，不是实时状态。新采集与通知尚未启用。</p></div>
    {selected ? <><Link className="rr-back" to={"/monitor/" + selected.provider}>← 返回 {platforms[selected.provider].name} 监控</Link><Evidence key={selected.id} event={selected} /></> : guide ? <section className="rr-guide rr-panel">
      <span className="rr-kicker">QUICK GUIDE</span><h1>一条公告，三步看懂。</h1><p className="rr-lead">先看类型，再核对范围，最后打开你的用量页面。</p>
      {[
        ["01", "分清公告类型", "待确认是官方预告，不代表已经完成。重置卡通常需要领取或使用；额度重置则是某次公开确认的历史事件。"],
        ["02", "查看原帖与适用范围", "每条记录都保留来源。公告可能仅适用部分套餐、地区或使用条件，不能直接推断你的账户已经恢复。"],
        ["03", "在自己的账户里核对", "网站不读取你的登录状态和个人额度。剩余用量与下次个人周期重置时间，以对应产品的 Usage 页面为准。"],
      ].map(([n, title, body]) => <div className="rr-guide-step" key={n}><span>{n}</span><div><h2>{title}</h2><p>{body}</p></div></div>)}
      <div className="rr-note">为什么没有倒计时和预测概率？没有明确的官方时间时，不编造精确数字。采集任务的检查时间也不等于额度重置时间。</div>
    </section> : cases ? <>
      <div className="rr-heading"><span className="rr-kicker">SELECTED SIDE HUSTLES</span><h1>有结果，也看清怎么做到。</h1><p className="rr-lead">精选真实案例摘要。收入与成绩均为作者自述，不代表普遍结果。</p></div>
      <div className="rr-case-grid">{snapshot.articles.map(a => <article className="rr-case rr-panel" key={a.id}><span className="rr-case-tag">{a.category}</span><h2>{a.title}</h2><span className="rr-muted">{a.author} · {dt(a.publishedAt).slice(0, 5)}</span><p>{a.summary}</p><details><summary>这篇能解决什么问题？</summary><ul>{a.questions.map(q => <li key={q}>{q}</li>)}</ul></details><a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="rr-case-link">阅读生财原文 ↗</a><small>{a.sourceNote}</small></article>)}</div>
      {!snapshot.articles.length && <div className="rr-empty">还没有已迁移的案例。</div>}
    </> : <>
      <div className={overview ? "rr-heading rr-hero" : "rr-heading"}>
        <div className="rr-hero-copy"><span className="rr-kicker">LESS NOISE. MORE CLARITY.</span><h1>{provider ? platforms[provider].name + " 重置记录" : overview ? <>重置消息，<br/>不必到处找。</> : "每一次重置，都有迹可循。"}</h1><p className="rr-lead">公告、范围、原始依据，一处看清。<span>不把预告当完成，不把公开消息当个人额度。</span></p>
        {overview && <><div className="rr-actions"><Link className="rr-button primary" to="/history">查看重置记录 ↗</Link><Link className="rr-button" to="/discover">浏览 AI 精选 →</Link></div><div className="rr-hero-stats"><span><b>03</b> 追踪平台</span><span><b>{snapshot.events.length.toString().padStart(2, "0")}</b> 历史公告</span><span><b>{snapshot.articles.length.toString().padStart(2, "0")}</b> 案例摘要</span></div></>}
        </div>
        {overview && <div className="rr-hero-art" aria-hidden="true"><div className="rr-orbit"><i/><i/><i/><b>◎</b><span className="rr-orbit-label one">CODEX</span><span className="rr-orbit-label two">CLAUDE</span><span className="rr-orbit-label three">GROK</span></div><small>PUBLIC SIGNALS / 历史快照</small></div>}
      </div>
      {overview && <div className="rr-platforms">{PROVIDERS.map(id => {
        const p = platforms[id]; const latest = snapshot.events.find(e => e.provider === id);
        return <Link to={"/monitor/" + id} className={"rr-platform " + p.color} key={id}><div className="rr-row"><span className={"rr-mark " + p.color}>{p.mark}</span><div><h2>{p.name}</h2><small>{p.company}</small></div><span className="rr-arrow">↗</span></div><div className="rr-platform-status">{latest ? eventStatus(latest.kind) : "暂无公开记录"}</div><p>{latest ? dt(latest.publishedAt) + " · 最近一条历史记录" : "接入后展示可核验的公告"}</p><div className="rr-platform-bottom"><span>{p.source}</span><span>查看记录 →</span></div></Link>;
      })}</div>}
      {overview && <nav className="rr-shortcuts" aria-label="功能快捷入口">{[
        ["/hot", "01", "热点榜", "看值得关注的讨论"],
        ["/daily", "02", "AI 日报", "按日期阅读内容汇总"],
        ["/leaderboard", "03", "模型榜", "对照公开评测选模型"],
        ["/agent", "04", "Agent 接入", "让你的工具读到本站"],
      ].map(([to, number, title, subtitle]) => <Link key={to} to={to}><span>{number}</span><div><b>{title}</b><small>{subtitle}</small></div><em>↗</em></Link>)}</nav>}
      <div className={overview ? "rr-columns" : ""}><Feed key={provider ?? path} events={shown} compact={overview} />{overview && <aside className="rr-aside">
        <section className="rr-radar-panel"><div className="rr-row"><span className="rr-kicker">SOURCE RADAR</span><span className="rr-muted">尚未启动</span></div><div className="rr-radar" aria-hidden="true"><i/><i/><i/><b>◎</b><span/></div><h2>追踪有依据的消息</h2><p>迁移中保留 {snapshot.events.length} 条公告。完成信源接入后，再启用自动核验与更新。</p><Link to="/guide">了解判断规则 →</Link></section>
        <section className="rr-aside-note"><span className="rr-kicker">BEFORE YOU RESET</span><h3>公告已发 ≠ 你的额度已恢复</h3><p>先确认适用套餐，再到个人 Usage 页面核对。</p><Link to="/guide">三步看懂重置 →</Link></section>
        <Link to="/side-hustles" className="rr-case-entry"><span>精选副业 · {snapshot.articles.length} 篇摘要</span><h3>把 AI 用起来，也看看别人怎么做。</h3><span>探索真实案例 ↗</span></Link>
      </aside>}</div>
    </>}
    <footer className="rr-footer"><span>重置雷达 · 先看事实，再看原帖。</span><span>北骁 · 微信 7547211</span><span>基于 AIHOT · MIT 开源底座</span></footer>
  </div>;
}
