import { data, Link, useLoaderData, useRevalidator, type LoaderFunctionArgs } from "react-router";
import { PROVIDERS, eventStatus, type Provider, type ResetRelaySnapshot } from "@aihot/contracts/reset-relay";
import { loadOr404 } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { Feed } from "./home";
import "../features/relay/monitor.css";

const platforms = {
  codex: { name: "Codex", company: "OpenAI", mark: "C", source: "Tibo / OpenAI", tone: "teal" },
  claude: { name: "Claude", company: "Anthropic", mark: "✳", source: "Anthropic 官方", tone: "clay" },
  grok: { name: "Grok", company: "xAI", mark: "G", source: "xAI 官方", tone: "blue" },
};
function PlatformMark({ id, small = false }: { id: Provider; small?: boolean }) {
  const asset = { codex: "openai", claude: "anthropic", grok: "xai" }[id];
  return <span className={"rm-logo" + (small ? " small" : "")}><img src={"/model-providers/" + asset + ".svg"} alt="" /></span>;
}
const stamp = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (params.provider && !PROVIDERS.includes(params.provider as Provider)) throw data(null, { status: 404 });
  const snapshot = await loadOr404<ResetRelaySnapshot>("/api/site/reset-relay", { signal: request.signal });
  return data({ snapshot, provider: params.provider as Provider | undefined }, { headers: { "Cache-Control": "no-store" } });
}
export function headers() { return { "Cache-Control": "no-store" }; }
export function meta() { return pageMeta({ title: "重置监控 · 三个平台，一个入口", path: "/monitor", noindex: true }); }

export default function ResetMonitor() {
  const { snapshot, provider } = useLoaderData<typeof loader>();
  const refresh = useRevalidator();
  const events = snapshot.events.filter(e => !provider || e.provider === provider).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const latest = events[0];
  const platform = provider ? platforms[provider] : null;
  return <div className="rr rm">
    <div className="rm-top"><span>模型与工具 <i>/</i> <b>重置监控</b></span><span className="rm-preview">本机预览 · 历史快照</span></div>
    <header className="rm-heading"><div><span className="rr-kicker">RESET MONITOR</span><h1>重置监控</h1><p>三个平台，一个入口。先看公告，再看依据。</p></div><div className="rm-radar-art" aria-hidden="true"><i/><i/><b>●</b></div></header>
    <div className="rm-toolbar"><nav className="rm-tabs" aria-label="监控平台">
      <Link to="/monitor" aria-current={!provider ? "page" : undefined}>全部平台</Link>
      {PROVIDERS.map(id => <Link key={id} to={"/monitor/" + id} aria-current={id === provider ? "page" : undefined}>{platforms[id].name}</Link>)}
    </nav><Link className="rr-button" to="/history">历史记录 ↗</Link></div>
    <div className="rm-notice">快照截至 {stamp(snapshot.generatedAt)}（北京时间），不是实时状态。新采集与通知尚未启用。<button onClick={() => refresh.revalidate()} disabled={refresh.state !== "idle"}>{refresh.state === "idle" ? "↻ 刷新快照" : "读取中…"}</button></div>
    {platform ? <section className="rm-summary" aria-label={platform.name + " 公告概览"}>
      <div className="rm-summary-main"><div className="rm-brand"><PlatformMark id={provider!}/><div><h2>{platform.name}</h2><p>{platform.company}</p></div></div>
        <div className="rm-summary-copy"><span className={"rm-state " + (latest?.kind === "signal" ? "pending" : "")}>{latest ? eventStatus(latest.kind) : "暂无公开记录"}</span><h2>{latest ? latest.kind === "signal" ? "有重置预告，不等于已经完成" : latest.title : "等待有原始依据的公告"}</h2><p>公开公告不代表你的个人额度，最终以账户 Usage 页面为准。</p></div></div>
      <div className="rm-summary-foot"><dl><div><dt>公告来源</dt><dd>{platform.source}{provider === "codex" ? " · @thsottiaux" : ""}</dd></div><div><dt>数据状态</dt><dd>{latest ? "历史记录 · " + stamp(latest.publishedAt) : "尚无已收录公告"} · 尚未实时同步</dd></div></dl>
        {latest && <a className="rr-button" href={latest.sourceUrl} target="_blank" rel="noopener noreferrer">查看原始公告 ↗</a>}
      </div>
    </section> : <div className="rm-overview">{PROVIDERS.map(id => {
      const p = platforms[id]; const event = events.find(e => e.provider === id);
      return <Link to={"/monitor/" + id} key={id}><div className="rr-row"><PlatformMark id={id}/><h2>{p.name}</h2><span className="rr-arrow">↗</span></div><h3>{event ? eventStatus(event.kind) : "暂无公开记录"}</h3><p>{p.source}</p><small>{event ? stamp(event.publishedAt) + " · 最近历史记录" : "等待有依据的公告"}</small></Link>;
    })}</div>}
    <div className="rm-content"><div><div className="rm-section-title"><h2>公告与核验记录</h2><span>{provider ? platforms[provider].name : "全部平台"} · {events.length} 条</span></div><Feed key={provider ?? "all"} events={events} monitor/></div>
      <aside className="rm-rules"><span className="rr-kicker">SOURCES & RULES</span><h2>信源与规则</h2><p>不同平台的公告来源与核验规则。</p><div className="rm-source-list">{PROVIDERS.map(id => <div key={id}><PlatformMark id={id} small/><b>{platforms[id].name}</b><span>→</span><small>{platforms[id].source}</small></div>)}</div><p className="rm-rule-line">来源不是平台，预告不是完成。</p><p>只记录有原帖依据的公开消息；尚未重新核对历史公告的后续变化。</p><p>不读取你的个人账户。</p><Link to="/guide">查看完整判断规则 ↗</Link></aside>
    </div>
    <footer className="rr-footer"><span>重置雷达 · 先看事实，再看原帖。</span><span>北骁 · 微信 7547211</span></footer>
  </div>;
}
