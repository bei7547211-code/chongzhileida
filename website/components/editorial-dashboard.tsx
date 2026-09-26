'use client';
/* oxlint-disable next/no-img-element -- local editorial art and uncropped evidence use intrinsic aspect ratios */
/* oxlint-disable react/react-compiler -- browser-only time and localStorage are initialized after hydration */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Radar,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Calculator,
  Rss,
  Search,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  publicPlatforms,
  type PublicPlatform,
  type PublicAnnouncement,
} from '@/data/public-platforms';
import { computeModels, pricingSourceUrl } from '@/data/compute-hub';
import { calculateTokenCost } from '@/lib/token-cost';
import { platformFreshness, platformHeadline } from '@/lib/platform-state';
import { sideHustles } from '@/data/side-hustles';
import { EditorialShare } from './editorial-share';

const nav = [
  ['home', '首页', '/'],
  ['codex', 'Codex', '/codex'],
  ['claude', 'Claude', '/claude'],
  ['grok', 'Grok', '/grok'],
  ['tools', '工具', '/tools'],
  ['knowledge', '知识库', '/knowledge'],
];
export function EditorialHeader({ active = 'home' }: { active?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="ed-header">
      <Link href="/" className="ed-brand">
        <Radar size={34} />
        <span>
          resetrelay.com<small>追踪 AI 重置 · 看见真实信息</small>
        </span>
      </Link>
      <button
        className="ed-menu"
        aria-expanded={open}
        aria-controls="ed-main-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}菜单
      </button>
      <nav
        id="ed-main-navigation"
        className={open ? 'is-open' : ''}
        aria-label="网站分类"
      >
        {nav.map(([id, label, url]) => (
          <Link
            key={id}
            href={url}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
        <Link
          className="ed-nav-hustle"
          href="/side-hustles"
          aria-current={active === 'side-hustles' ? 'page' : undefined}
        >
          精选副业
        </Link>
      </nav>
    </header>
  );
}
export function EditorialFooter() {
  const [message, setMessage] = useState('');
  return (
    <footer className="ed-footer">
      <span>公共公告不等于个人余额 · 与各平台无隶属关系</span>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText('7547211');
            setMessage('微信号已复制，请在微信中搜索添加');
          } catch {
            setMessage('请手动复制微信号：7547211');
          }
        }}
      >
        联系站长 · 微信 7547211
      </button>
      {message && <output>{message}</output>}
    </footer>
  );
}
function time(value: string | null, full = false) {
  return value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        ...(full ? { year: 'numeric' as const } : {}),
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '尚未核验';
}
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
function Freshness({
  platform: p,
  now,
}: {
  platform: PublicPlatform;
  now: number | null;
}) {
  const stale = now !== null && platformFreshness(p.checkedAt, now) !== 'fresh';
  return (
    <div className={'ed-freshness ' + (stale || p.error ? 'is-stale' : '')}>
      <Clock3 size={14} />
      <span>
        {p.error
          ? '本次采集失败 · 保留历史记录'
          : stale
            ? '数据待更新 · 请同时查看官方来源'
            : '最近成功采集'}{' '}
        · {time(p.checkedAt)} <small>北京时间</small>
      </span>
    </div>
  );
}
export function SubscriptionDialog({
  platform = 'all',
}: {
  platform?: string;
}) {
  const [feedback, setFeedback] = useState('');
  const url = `https://www.resetrelay.com/${platform === 'all' ? 'feed.xml' : platform + '/feed.xml'}`;
  return (
    <Dialog>
      <DialogTrigger className="ed-button ed-primary">
        <Bell size={17} />
        订阅重置提醒
      </DialogTrigger>
      <DialogContent className="ed-dialog">
        <DialogHeader>
          <Rss className="ed-dialog-icon" />
          <DialogTitle>订阅重置提醒</DialogTitle>
          <DialogDescription>
            提醒会出现在你的 RSS 阅读器中；只收录已核验的公开公告。
          </DialogDescription>
        </DialogHeader>
        <ol className="ed-steps">
          <li>
            <b>01</b>
            <div>
              <strong>复制订阅地址</strong>
              <p>
                {platform === 'all'
                  ? '包含三个平台的已确认公告。'
                  : '只订阅当前平台。'}
              </p>
            </div>
          </li>
          <li>
            <b>02</b>
            <div>
              <strong>打开你的阅读器</strong>
              <p>例如 Feedly、NetNewsWire 或 Inoreader。</p>
            </div>
          </li>
          <li>
            <b>03</b>
            <div>
              <strong>添加来源</strong>
              <p>粘贴地址并确认；之后在阅读器里接收更新。</p>
            </div>
          </li>
        </ol>
        <div className="ed-copy-field">
          <input
            aria-label="RSS订阅地址"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button
            className="ed-button ed-primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setFeedback('地址已复制，请在阅读器中添加来源。');
              } catch {
                setFeedback('自动复制失败，请手动选择地址复制。');
              }
            }}
          >
            复制地址
          </button>
        </div>
        <output>{feedback || '不会自动订阅微信或短信，无需本站账号。'}</output>
      </DialogContent>
    </Dialog>
  );
}
function UsageDialog() {
  return (
    <Dialog>
      <DialogTrigger className="ed-button">查看额度指引 ↗</DialogTrigger>
      <DialogContent className="ed-dialog">
        <DialogHeader>
          <DialogTitle>检查你的个人额度</DialogTitle>
          <DialogDescription>
            不同账户有各自的使用窗口。公开公告不能代替账户内的余额。
          </DialogDescription>
        </DialogHeader>
        <div className="ed-link-list">
          <a
            href="https://chatgpt.com/codex/settings/usage"
            target="_blank"
            rel="noreferrer"
          >
            Codex · 打开 Usage 页面 ↗
          </a>
          <a
            href="https://claude.ai/settings/usage"
            target="_blank"
            rel="noreferrer"
          >
            Claude · 打开 Usage 页面 ↗
          </a>
          <a href="https://grok.com" target="_blank" rel="noreferrer">
            Grok · 打开产品后查看账户用量 ↗
          </a>
        </div>
        <p>需要登录对应产品。核对短窗口、周额度和下一次重置时间。</p>
      </DialogContent>
    </Dialog>
  );
}
function PlatformCards({ now }: { now: number | null }) {
  return (
    <>
      <div className="ed-platforms">
        {publicPlatforms.map((p) => {
          const last = p.announcements[0];
          return (
            <article className={'ed-platform ed-' + p.id} key={p.id}>
              <Link href={'/' + p.id} className="ed-portrait-link">
                <div className="ed-platform-name">
                  <h2>{p.name}</h2>
                  <span>{p.person}</span>
                </div>
                <img src={p.portrait} alt={p.person + ' 的平台识别插画'} />
              </Link>
              <div className="ed-platform-caption">
                <Link href={'/' + p.id}>
                  <CheckCircle2 size={23} />
                  <strong>
                    {last
                      ? p.id === 'grok' && last.scope.includes('Grok Bot')
                        ? 'Grok Bot 重置记录'
                        : platformHeadline(last.kind)
                      : '尚无已核验重置'}
                  </strong>
                  <ArrowUpRight size={18} />
                </Link>
                <small>
                  {last
                    ? '最近公告 ' + time(last.publishedAt)
                    : '等待明确的官方公告'}
                </small>
                <Freshness platform={p} now={now} />
              </div>
            </article>
          );
        })}
      </div>
      <p className="ed-art-note">
        人物为编辑插画，用于区分平台，不代表本人或平台背书。
      </p>
    </>
  );
}
function HistoryTable({
  items,
  name,
}: {
  items: PublicAnnouncement[];
  name?: string;
}) {
  return (
    <div className="ed-table-wrap">
      <table className="ed-table">
        <caption className="sr-only">{name || '三个平台'}重置记录</caption>
        <thead>
          <tr>
            <th>公告发布</th>
            <th>类型</th>
            <th>事件与范围</th>
            <th>依据</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>
                <time dateTime={a.publishedAt}>{time(a.publishedAt)}</time>
              </td>
              <td>
                <span className={'ed-kind ' + a.kind}>
                  {a.kind === 'signal' ? '待确认消息' : a.kind === 'banked' ? '重置次数' : '额度重置'}
                </span>
              </td>
              <td>
                <strong>{a.title}</strong>
                <small>{a.scope}</small>
              </td>
              <td>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={a.title + ' 原帖'}
                >
                  原帖 ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <p className="ed-empty">
          暂无该类型的已核验记录。普通动态不会计入重置历史。
        </p>
      )}
    </div>
  );
}
function Home({ now }: { now: number | null }) {
  const items = publicPlatforms
    .flatMap((p) => p.announcements)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);
  return (
    <>
      <section className="ed-home-intro">
        <div>
          <p className="ed-kicker">AI RESET RADAR</p>
          <h1>
            重置有消息，
            <br className="ed-mobile-break" />
            这里先看清。
          </h1>
          <p>追踪公开公告，核验原帖依据。个人额度以账户页面为准。</p>
        </div>
        <div className="ed-intro-action">
          <SubscriptionDialog />
          <small>通过 RSS 接收已核验公告</small>
        </div>
      </section>
      <PlatformCards now={now} />
      <div className="ed-home-bottom">
        <section className="ed-panel">
          <div className="ed-section-head">
            <h2>最近重置记录</h2>
            <Link href="/codex">查看平台记录 →</Link>
          </div>
          <HistoryTable items={items} />
        </section>
        <aside className="ed-hustle-promo">
          <p className="ed-kicker">REAL PEOPLE / REAL CASES</p>
          <h2>值得看的真实副业案例</h2>
          <p>先看做成了什么，再决定是否深入。</p>
          <div className="ed-avatars">
            {sideHustles.slice(0, 4).map((p) => (
              <img key={p.slug} src={p.avatar} alt={p.author} />
            ))}
            <span>{sideHustles.length} 篇</span>
          </div>
          <Link href="/side-hustles" className="ed-button ed-terra">
            浏览精选案例 →
          </Link>
          <small>原帖可追溯 · 成绩为作者自述</small>
        </aside>
      </div>
    </>
  );
}
function ProviderPage({
  platform: p,
  now,
}: {
  platform: PublicPlatform;
  now: number | null;
}) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    p.announcements[0]?.id,
  );
  const last = p.announcements[0];
  const visible = p.announcements.filter(
    (a) => filter === 'all' || a.kind === filter,
  );
  const selected = visible.find((a) => a.id === selectedId) || visible[0];
  return (
    <>
      <div className="ed-breadcrumb">
        <Link href="/">首页</Link> / {p.name}
      </div>
      <section className="ed-page-intro">
        <p className="ed-kicker">
          {p.name.toUpperCase()} / PUBLIC RESET RECORDS
        </p>
        <h1>{p.name} 重置记录</h1>
        <p>同一条公告，从结论到原帖。这里记录公开信息，不读取你的账号。</p>
      </section>
      <section className={'ed-provider-status ed-' + p.id}>
        <img src={p.portrait} alt="" />
        <div>
          <span className="ed-kicker">最近官方消息 · 不代表个人余额</span>
          <h2>{last ? platformHeadline(last.kind) : '尚无已核验重置'}</h2>
          <p>{last?.scope || '采集流程已接入，等待明确公告。'}</p>
          <Freshness platform={p} now={now} />
        </div>
        <div className="ed-published">
          <small>公告发布 · 北京时间</small>
          <strong>{last ? time(last.publishedAt, true) : '未公布'}</strong>
          <a href={last?.url || p.officialUrl} target="_blank" rel="noreferrer">
            查看官方原帖 ↗
          </a>
        </div>
      </section>
      <div className="ed-action-row">
        <SubscriptionDialog platform={p.id} />
        <UsageDialog />
        {selected && (
          <EditorialShare
            key={selected.id}
            name={p.name}
            announcement={selected}
          />
        )}
      </div>
      <div className="ed-detail-grid">
        <section className="ed-panel">
          <div className="ed-section-head">
            <h2>原帖依据</h2>
            <span>不把转述当原始证据</span>
          </div>
          {selected ? (
            <article className="ed-evidence">
              <div className="ed-section-head">
                <strong>{selected.title}</strong>
                <small>{time(selected.publishedAt)}</small>
              </div>
              {selected.screenshot ? (
                <img
                  className="ed-source-image"
                  src={selected.screenshot}
                  alt={selected.title + ' 原帖截图'}
                />
              ) : (
                <blockquote>
                  <small>原文摘录 · 非截图</small>
                  <p>{selected.text}</p>
                </blockquote>
              )}
              {selected.screenshotNote && (
                <p className="ed-hint">{selected.screenshotNote}</p>
              )}
              {selected.screenshot && (
                <details className="ed-original-text">
                  <summary>查看英文原文</summary>
                  <p>{selected.text}</p>
                </details>
              )}
              <p className="ed-scope">适用范围：{selected.scope}</p>
              <a href={selected.url} target="_blank" rel="noreferrer">
                打开完整原帖核验 ↗
              </a>
              {!selected.screenshot && (
                <small className="ed-hint">
                  暂未收录对应原帖截图，暂不生成证据分享卡。
                </small>
              )}
            </article>
          ) : (
            <p className="ed-empty">尚无已核验公告，不展示推测性截图或历史。</p>
          )}
        </section>
        <aside className="ed-panel ed-reading-guide">
          <p className="ed-kicker">READ THE SIGNAL</p>
          <h2>看懂这条消息</h2>
          <ol>
            <li>
              <strong>确认适用范围</strong>
              <p>Bot、Chat、Code 的额度并不相同；以原帖所述产品为准。</p>
            </li>
            <li>
              <strong>区分重置与重置次数</strong>
              <p>有的公告立即恢复额度，有的发放一次可自行使用的重置。</p>
            </li>
            <li>
              <strong>核对个人账户</strong>
              <p>公开发布不等于你的账户已到账，最终以产品内显示为准。</p>
            </li>
          </ol>
          <Link href="/knowledge">阅读重置知识库 →</Link>
        </aside>
      </div>
      <section className="ed-panel ed-history">
        <div className="ed-section-head">
          <h2>
            已核验重置历史 <small>{p.announcements.length} 条</small>
          </h2>
          <div className="ed-filters">
            {[
              ['all', '全部'],
              ['full', '额度重置'],
              ['banked', '重置次数'],
              ['signal', '待确认消息'],
            ].map(([v, l]) => (
              <button
                key={v}
                aria-pressed={filter === v}
                onClick={() => {
                  setFilter(v);
                  setSelectedId(
                    p.announcements.find((a) => v === 'all' || a.kind === v)
                      ?.id,
                  );
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <HistoryTable items={visible} name={p.name} />
        {visible.length > 1 && (
          <div className="ed-source-picker">
            <label>
              选择要查看的原帖
              <select
                value={
                  visible.some((a) => a.id === selectedId)
                    ? selectedId
                    : visible[0]?.id
                }
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {visible.map((a) => (
                  <option key={a.id} value={a.id}>
                    {time(a.publishedAt)} · {a.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <p className="ed-hint">{p.coverage}</p>
      </section>
      <section className="ed-panel ed-history">
        <div className="ed-section-head">
          <h2>最近公开动态</h2>
          <a href={p.officialUrl} target="_blank" rel="noreferrer">
            官方账号 ↗
          </a>
        </div>
        <div className="ed-post-list">
          {p.posts.slice(0, expanded ? 30 : 3).map((post) => (
            <a href={post.url} target="_blank" rel="noreferrer" key={post.id}>
              <time>{time(post.publishedAt)}</time>
              <p>{post.text}</p>
              <ArrowUpRight size={18} />
            </a>
          ))}
        </div>
        {p.posts.length > 3 && (
          <button className="ed-button" onClick={() => setExpanded(!expanded)}>
            {expanded ? '收起动态' : '查看全部动态'}
          </button>
        )}
        <small className="ed-hint">
          动态不等于重置公告；只有明确核验的重置才会进入上方历史。
        </small>
      </section>
    </>
  );
}
const faq = [
  {
    category: '重置规则',
    q: '网站显示重置，我的额度一定恢复了吗？',
    a: '不一定。这里记录官方公开公告，你的个人余额和重置时间仍以账户里的用量页面为准。',
  },
  {
    category: '重置规则',
    q: '额度重置和重置次数有什么区别？',
    a: '额度重置通常指恢复某个使用窗口；重置次数是一次可以自行使用的机会。不同产品规则不同，请先看原帖适用范围，再查看账户。',
  },
  {
    category: '个人额度',
    q: '在哪里查看自己的剩余额度？',
    a: '在对应产品的账户设置中查看 Usage 或用量。工具页提供入口。本站不会读取你的登录凭证，也不会用站长账户余额代表你的余额。',
  },
  {
    category: '提醒与分享',
    q: '怎么接收重置提醒？',
    a: '复制本站 RSS 地址，在 Feedly、NetNewsWire 等阅读器中添加来源。提醒出现在阅读器里，不会自动发送到微信或短信。',
  },
  {
    category: '提醒与分享',
    q: '如何核验分享卡里的消息？',
    a: '扫描二维码进入本站，找到同平台、同日期的公告并打开原帖。卡片区分真实截图与原文摘录，不把插画当证据。',
  },
  {
    category: '重置规则',
    q: '为什么会显示“数据待更新”？',
    a: '距离上次成功采集已超过预期窗口。历史记录仍可查，但不能据此判断当前状态；请同时查看官方渠道。',
  },
];
function Knowledge() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [count, setCount] = useState(0);
  const [storageHint, setStorageHint] = useState('');
  useEffect(() => {
    try {
      const n = Number(localStorage.getItem('reset-relay-prayer-count'));
      setCount(Number.isSafeInteger(n) && n > 0 ? n : 0);
    } catch {
      setStorageHint('浏览器无法保存，次数仅在本次页面有效。');
    }
  }, []);
  const items = faq.filter(
    (f) =>
      (category === '全部' || f.category === category) &&
      (f.q + f.a).includes(query.trim()),
  );
  return (
    <>
      <section className="ed-page-intro">
        <p className="ed-kicker">PLAIN ANSWERS</p>
        <h1>知识库</h1>
        <p>关于重置，先把规则说清楚。</p>
      </section>
      <div className="ed-search">
        <Search size={20} />
        <input
          aria-label="搜索你的问题"
          placeholder="搜索你的问题"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="ed-filters">
        {['全部', '重置规则', '个人额度', '提醒与分享'].map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="ed-faq">
        {items.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
        {!items.length && (
          <p className="ed-empty">没有匹配的问题，换个关键词试试。</p>
        )}
      </div>
      <section className="ed-prayer">
        <div>
          <h2>一起等下一次重置</h2>
          <p>
            本设备已祈愿 <strong aria-live="polite">{count}</strong> 次 ·
            次数仅保存在当前浏览器
          </p>
          <small>{storageHint}</small>
        </div>
        <button
          className="ed-button ed-primary"
          onClick={() => {
            const n = Math.min(count + 1, Number.MAX_SAFE_INTEGER);
            setCount(n);
            try {
              localStorage.setItem('reset-relay-prayer-count', String(n));
            } catch {
              setStorageHint('浏览器无法保存，次数仅在本次页面有效。');
            }
          }}
        >
          🙏 祈愿一次
        </button>
      </section>
    </>
  );
}
function Tools() {
  const [model, setModel] = useState(computeModels[0]);
  const [values, setValues] = useState(['100000', '20000', '10']);
  const [provider, setProvider] = useState('codex');
  const p = publicPlatforms.find((x) => x.id === provider)!;
  const valid = values.every(
    (v, i) =>
      v.trim() !== '' &&
      Number.isFinite(Number(v)) &&
      Number(v) >= 0 &&
      Number(v) <= (i === 2 ? 1000000 : 1000000000) &&
      Number.isInteger(Number(v)),
  );
  const cost = valid
    ? calculateTokenCost({
        inputTokens: Number(values[0]),
        outputTokens: Number(values[1]),
        runs: Number(values[2]),
        price: model,
      })
    : null;
  return (
    <>
      <section className="ed-page-intro">
        <p className="ed-kicker">USEFUL TOOLS</p>
        <h1>常用工具</h1>
        <p>算清成本，找到额度，分享可靠消息。</p>
      </section>
      <section className="ed-panel ed-calculator">
        <div className="ed-section-head">
          <h2>
            <Calculator /> Token 成本估算
          </h2>
          <span>2026-09-24 标准短上下文价格 · 非实时计价</span>
        </div>
        <div className="ed-models">
          {computeModels.map((m) => (
            <button
              key={m.id}
              aria-pressed={m.id === model.id}
              onClick={() => setModel(m)}
            >
              {m.name}
              <small>{m.badge}</small>
            </button>
          ))}
        </div>
        <div className="ed-inputs">
          {['每次输入 Token', '每次输出 Token', '每月执行次数'].map(
            (label, i) => (
              <label key={label}>
                {label}
                <input
                  type="number"
                  min="0"
                  max={i === 2 ? 1000000 : 1000000000}
                  step="1"
                  value={values[i]}
                  onChange={(e) =>
                    setValues(
                      values.map((v, j) => (i === j ? e.target.value : v)),
                    )
                  }
                />
              </label>
            ),
          )}
        </div>
        {!valid && (
          <p role="alert" className="ed-validation">
            请输入范围内的非负整数：Token 不超过十亿，月执行次数不超过一百万。
          </p>
        )}
        <div className="ed-cost" aria-live="polite">
          <div>
            <small>预估月成本</small>
            <strong>
              {cost
                ? '$' + cost.totalCost.toFixed(cost.totalCost < 0.01 ? 4 : 2)
                : '—'}
            </strong>
          </div>
          <div>
            <p>
              输入 ${model.inputPerMillion}/M · 输出 ${model.outputPerMillion}/M
            </p>
            <a href={pricingSourceUrl} target="_blank" rel="noreferrer">
              核对官方当前计价 ↗
            </a>
          </div>
        </div>
        <p className="ed-hint">
          按标准处理估算；缓存、长上下文及工具调用可能影响最终账单。
        </p>
      </section>
      <div className="ed-tool-cards">
        <article className="ed-panel">
          <BookOpen />
          <h2>检查个人额度</h2>
          <p>到官方产品中查看你的用量和窗口。</p>
          <UsageDialog />
        </article>
        <article className="ed-panel">
          <Rss />
          <h2>RSS 订阅</h2>
          <p>选择阅读器，接收已核验公告。</p>
          <SubscriptionDialog />
        </article>
        <article className="ed-panel">
          <Radar />
          <h2>生成分享卡</h2>
          <p>只分享有来源、有范围的公开事实。</p>
          <select
            aria-label="选择分享平台"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {publicPlatforms.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          {p.announcements[0] ? (
            <EditorialShare name={p.name} announcement={p.announcements[0]} />
          ) : (
            <p>暂无已核验公告，暂不能生成分享卡。</p>
          )}
        </article>
      </div>
    </>
  );
}
export function EditorialDashboard({ view = 'home' }: { view?: string }) {
  const now = useNow();
  const p = publicPlatforms.find((x) => x.id === view);
  return (
    <main className="editorial-site">
      <div className="ed-shell">
        <EditorialHeader active={view} />
        {view === 'home' ? (
          <Home now={now} />
        ) : p ? (
          <ProviderPage key={p.id} platform={p} now={now} />
        ) : view === 'tools' ? (
          <Tools />
        ) : (
          <Knowledge />
        )}
        <EditorialFooter />
      </div>
    </main>
  );
}
