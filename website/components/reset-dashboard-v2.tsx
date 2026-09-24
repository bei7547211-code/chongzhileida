'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Gauge,
  Gift,
  Info,
  MessageCircle,
  Radio,
  Rss,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResetShareCard } from '@/components/reset-share-card';
import {
  SiteCategoryNav,
  type SiteCategory,
} from '@/components/site-category-nav';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { providerCatalog, type ProviderId } from '@/data/provider-catalog';
import {
  computeModels,
  computeOpportunities,
  pricingSourceUrl,
} from '@/data/compute-hub';
import {
  announcements,
  kindMeta,
  resetEvents,
  resetStats,
  tibo,
  type ResetEvent,
  type ResetKind,
} from '@/data/reset-history';
import {
  tiboPosts,
  tiboPostsVerifiedAt,
  type TiboResetSignal,
} from '@/data/tibo-posts';
import { calculateResetProbability } from '@/lib/reset-probability';
import { getPublicResetState } from '@/lib/public-reset-state';
import { calculateTokenCost } from '@/lib/token-cost';
import { toShanghaiDateKey } from '@/lib/time';

type FilterKind = 'all' | ResetKind;
export type ResetDashboardView = SiteCategory;

const DAY_MS = 24 * 60 * 60 * 1000;
const latestAnnouncement = announcements[0];
const publicRssUrl = 'https://www.resetrelay.com/feed.xml';
const prayerStorageKey = 'reset-relay-prayer-count';
const filters: { value: FilterKind; label: string }[] = [
  { value: 'all', label: '全部记录' },
  { value: 'full', label: '额度重置' },
  { value: 'banked', label: '重置卡' },
  { value: 'signal', label: '重置信号' },
];
const signalMeta: Record<
  TiboResetSignal,
  { label: string; className: string }
> = {
  confirmed: { label: '确认重置', className: 'is-confirmed' },
  related: { label: '相关信号', className: 'is-related' },
  none: { label: '普通动态', className: 'is-neutral' },
};

const providerPresentation: Record<
  ProviderId,
  {
    artwork: string;
    figure: string;
    sourceRole: string;
    tone: string;
  }
> = {
  codex: {
    artwork: '/images/platform-cards/codex-tibo-v1.jpg',
    figure: 'Tibo',
    sourceRole: '公开公告来源',
    tone: 'gold',
  },
  claude: {
    artwork: '/images/platform-cards/claude-dario-v1.jpg',
    figure: 'Dario Amodei',
    sourceRole: 'Anthropic',
    tone: 'clay',
  },
  grok: {
    artwork: '/images/platform-cards/grok-elon-v1.jpg',
    figure: 'Elon Musk',
    sourceRole: 'xAI',
    tone: 'ink',
  },
};

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function createHeatmapWeeks(asOf: string) {
  const currentDay = new Date(toShanghaiDateKey(asOf) + 'T00:00:00.000Z');
  const daysSinceMonday = (currentDay.getUTCDay() + 6) % 7;
  const start = new Date(currentDay);
  start.setUTCDate(currentDay.getUTCDate() - daysSinceMonday - 25 * 7);

  return Array.from({ length: 26 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + weekIndex * 7 + dayIndex);
      return toDateKey(date);
    }),
  );
}

function formatChineseDate(date: string) {
  const [year, month, day] = date.split('-');
  return year + ' 年 ' + Number(month) + ' 月 ' + Number(day) + ' 日';
}

function getRelativeTime(publishedAt: string, asOf = tiboPostsVerifiedAt) {
  const elapsed = Math.max(0, Date.parse(asOf) - Date.parse(publishedAt));
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return { value: '刚刚', unit: '' };
  if (hours < 24) return { value: String(hours), unit: '小时前' };
  return { value: String(Math.floor(hours / 24)), unit: '天前' };
}

function formatRelativeTime(publishedAt: string) {
  const relative = getRelativeTime(publishedAt);
  return relative.value + (relative.unit ? ' ' + relative.unit : '');
}

function formatPublishedTime(publishedAt: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(publishedAt));
}

function TiboAvatar({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'tibo-avatar tibo-avatar-sm' : 'tibo-avatar'}>
      <Image
        src={tibo.avatarUrl}
        alt="Tibo 头像"
        width={62}
        height={62}
        sizes={compact ? '46px' : '62px'}
        unoptimized
      />
      <span className="avatar-live" aria-hidden="true" />
    </span>
  );
}

function UsageDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="lg" className="pill-action" />}>
        <Gauge aria-hidden="true" /> 检查我的额度
      </DialogTrigger>
      <DialogContent className="core-dialog">
        <DialogHeader>
          <span className="dialog-icon" aria-hidden="true">
            <Gauge />
          </span>
          <DialogTitle>30 秒确认你的真实额度</DialogTitle>
          <DialogDescription>
            公共重置不等于每个账户的剩余额度，最终以你的 Usage 页面为准。
          </DialogDescription>
        </DialogHeader>
        <ol className="usage-steps">
          <li>
            <span>01</span>
            <div>打开 ChatGPT Desktop、Codex 或 ChatGPT 网页。</div>
          </li>
          <li>
            <span>02</span>
            <div>进入账户菜单，选择“设置 → Usage”。</div>
          </li>
          <li>
            <span>03</span>
            <div>核对 5 小时、周额度和下一次重置时间。</div>
          </li>
        </ol>
        <a
          className="dialog-official-link"
          href="https://help.openai.com/en/articles/20001498-how-banked-codex-resets-work"
          target="_blank"
          rel="noreferrer"
        >
          查看 OpenAI 官方说明 <ExternalLink aria-hidden="true" />
        </a>
      </DialogContent>
    </Dialog>
  );
}

function RssDialog({
  copied,
  onCopy,
}: {
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="lg" className="secondary-action" />
        }
      >
        <Rss aria-hidden="true" /> 免费接收提醒
      </DialogTrigger>
      <DialogContent className="core-dialog rss-dialog">
        <DialogHeader>
          <span className="dialog-icon" aria-hidden="true">
            <Rss />
          </span>
          <DialogTitle>免费接收真正的重置提醒</DialogTitle>
          <DialogDescription>
            不懂 RSS
            也没关系。它就像一个安静的消息订阅：有新公告时更新，平时不会打扰你。
          </DialogDescription>
        </DialogHeader>

        <div className="rss-rule-grid" aria-label="提醒规则">
          <article className="rss-rule-yes">
            <span>会提醒</span>
            <p>明确的额度重置、重置完成、重置卡公告。</p>
          </article>
          <article className="rss-rule-no">
            <span>不会提醒</span>
            <p>普通产品动态、群聊预测、未经证实的转述。</p>
          </article>
        </div>

        <div className="rss-address-group">
          <span>复制订阅地址</span>
          <div className="rss-address">
            <code>resetrelay.com/feed.xml</code>
            <Button type="button" size="sm" onClick={onCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? '复制成功' : '复制地址'}
            </Button>
          </div>
        </div>

        <div className="rss-tutorial">
          <h3>第一次使用，照着这三步做</h3>
          <ol className="usage-steps rss-steps">
            <li>
              <span>01</span>
              <div>点击上面的“复制地址”。</div>
            </li>
            <li>
              <span>02</span>
              <div>打开 Feedly、NetNewsWire 等任意订阅工具。</div>
            </li>
            <li>
              <span>03</span>
              <div>找到“添加来源”，粘贴地址并确认。</div>
            </li>
          </ol>
        </div>
        <p className="dialog-note">
          提醒会出现在订阅工具里，不会读取你的账户，也不需要本站登录。
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function ResetDashboardV2({
  view = 'home',
}: {
  view?: ResetDashboardView;
}) {
  const [filter, setFilter] = useState<FilterKind>('all');
  const [selectedEvent, setSelectedEvent] = useState<ResetEvent>(
    resetEvents[0],
  );
  const [rssCopied, setRssCopied] = useState(false);
  const [wechatCopied, setWechatCopied] = useState(false);
  const [previewCopied, setPreviewCopied] = useState(false);
  const [prayerCount, setPrayerCount] = useState(0);
  const [prayerReady, setPrayerReady] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [costModelId, setCostModelId] = useState(computeModels[0].id);
  const [inputTokens, setInputTokens] = useState(100_000);
  const [outputTokens, setOutputTokens] = useState(20_000);
  const [monthlyRuns, setMonthlyRuns] = useState(10);

  const heatmapWeeks = useMemo(
    () => createHeatmapWeeks(tiboPostsVerifiedAt),
    [],
  );
  const heatmapMonths = useMemo(
    () =>
      [...new Set(heatmapWeeks.flat().map((date) => date.slice(0, 7)))].map(
        (month) => String(Number(month.slice(5, 7))) + '月',
      ),
    [heatmapWeeks],
  );
  const eventMap = useMemo(
    () => new Map(resetEvents.map((event) => [event.date, event])),
    [],
  );
  const latestRelatedSignal = tiboPosts.find(
    (post) => post.resetSignal === 'related',
  );
  const publicResetState = getPublicResetState({
    latestAnnouncementAt: latestAnnouncement.publishedAt,
    latestRelatedSignal,
    verifiedAt: tiboPostsVerifiedAt,
  });
  const activeOfficialPreview =
    publicResetState.kind === 'scheduled' || publicResetState.kind === 'overdue'
      ? latestRelatedSignal
      : null;
  const probabilityModel = calculateResetProbability(
    resetEvents,
    tiboPosts,
    tiboPostsVerifiedAt,
  );
  const recentSignalCount = tiboPosts.filter(
    (post) =>
      post.resetSignal !== 'none' &&
      Date.parse(tiboPostsVerifiedAt) - Date.parse(post.publishedAt) <= DAY_MS,
  ).length;
  const highlightedPosts = useMemo(() => {
    const chosen = [
      ...tiboPosts.slice(0, 2),
      ...tiboPosts.filter((post) => post.resetSignal !== 'none'),
    ];
    return chosen
      .filter(
        (post, index, posts) =>
          posts.findIndex((candidate) => candidate.id === post.id) === index,
      )
      .slice(0, 3);
  }, []);
  const visibleTiboPosts = showAllPosts ? tiboPosts : highlightedPosts;
  const activeProviderId: ProviderId =
    view === 'claude' || view === 'grok' ? view : 'codex';
  const activeProvider =
    providerCatalog.find((provider) => provider.id === activeProviderId) ??
    providerCatalog[0];
  const activeCostModel =
    computeModels.find((model) => model.id === costModelId) ?? computeModels[0];
  const tokenCost = calculateTokenCost({
    inputTokens,
    outputTokens,
    runs: monthlyRuns,
    price: activeCostModel,
  });
  const formattedTokenCost =
    tokenCost.totalCost < 0.01
      ? tokenCost.totalCost.toFixed(4)
      : tokenCost.totalCost.toFixed(2);

  const codexStatus =
    publicResetState.kind === 'confirmed'
      ? {
          label: '已确认',
          headline: kindMeta[latestAnnouncement.kind].label + '已发放',
          detail: 'Tibo 已明确发布公告。现在请到 Usage 页面核对你的个人额度。',
          tone: 'confirmed',
        }
      : publicResetState.kind === 'scheduled'
        ? {
            label: '官方预告',
            headline:
              activeOfficialPreview?.preview?.headline ?? '出现新的官方预告',
            detail: '预告不等于已经重置，我们会等待完成公告后再确认。',
            tone: 'scheduled',
          }
        : publicResetState.kind === 'overdue'
          ? {
              label: '等待确认',
              headline: '预告日期已到，尚未看到完成公告',
              detail: '现在不把预告当结果，继续等待可以核验的完成信号。',
              tone: 'overdue',
            }
          : {
              label: '持续观察',
              headline: '尚未发现新的公开重置',
              detail:
                '普通产品动态不会被误报为重置，最近确认记录仍可在下方查看。',
              tone: 'watching',
            };

  const pageIntro = {
    codex: {
      kicker: 'CODEX RESET RADAR',
      title: 'Codex 重置雷达',
      description: '公开公告、历史间隔与 Tibo 原帖证据，集中放在这里。',
    },
    claude: {
      kicker: 'CLAUDE USAGE',
      title: 'Claude 额度状态',
      description: '只显示本机已授权账户能够读取的真实额度，不展示猜测值。',
    },
    grok: {
      kicker: 'GROK USAGE',
      title: 'Grok 额度状态',
      description: '独立查看周额度与重置时间，数据始终留在你的 Mac。',
    },
    tools: {
      kicker: 'PRACTICAL TOOLS',
      title: '常用工具',
      description: '检查额度、接收提醒、生成分享卡，只保留真正用得上的功能。',
    },
    knowledge: {
      kicker: 'PLAIN ANSWERS',
      title: '重置知识库',
      description: '先把规则说清楚，再决定是否需要提醒或进一步核验。',
    },
  } as const;
  const currentPageIntro = view === 'home' ? null : pageIntro[view];

  useEffect(() => {
    let savedCount = 0;
    try {
      savedCount = Number(window.localStorage.getItem(prayerStorageKey));
    } catch {
      // Local storage can be unavailable in privacy-restricted browsers.
    }
    const loadTimer = window.setTimeout(() => {
      if (Number.isSafeInteger(savedCount) && savedCount > 0) {
        setPrayerCount(savedCount);
      }
      setPrayerReady(true);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  async function copyRssUrl() {
    await navigator.clipboard.writeText(publicRssUrl);
    setRssCopied(true);
    window.setTimeout(() => setRssCopied(false), 2200);
  }

  async function copyOfficialPreview() {
    if (!activeOfficialPreview) return;
    await navigator.clipboard.writeText(
      activeOfficialPreview.title +
        '\n' +
        activeOfficialPreview.summary +
        '\n' +
        activeOfficialPreview.url,
    );
    setPreviewCopied(true);
    window.setTimeout(() => setPreviewCopied(false), 2200);
  }

  function recordPrayer() {
    if (!prayerReady) return;
    setPrayerCount((currentCount) => {
      const nextCount = Math.min(currentCount + 1, Number.MAX_SAFE_INTEGER);
      try {
        window.localStorage.setItem(prayerStorageKey, String(nextCount));
      } catch {
        // The interaction still works for the current page session.
      }
      return nextCount;
    });
  }

  async function copyWechatContact() {
    try {
      await navigator.clipboard.writeText('7547211');
      setWechatCopied(true);
      window.setTimeout(() => setWechatCopied(false), 2200);
    } catch {
      setWechatCopied(false);
    }
  }

  return (
    <main className={'radar-page radar-page-v2 radar-view-' + view}>
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-b" aria-hidden="true" />

      <div className="page-shell v2-shell">
        <header className="v2-topbar reveal reveal-1">
          <Link className="v2-brand" href="/" aria-label="返回重置雷达首页">
            <span className="v2-brand-mark" aria-hidden="true">
              <Radio />
            </span>
            <strong>
              resetrelay<span>.com</span>
            </strong>
          </Link>
          <SiteCategoryNav active={view} />
          <Link className="v2-side-link" href="/side-hustles">
            <Gift aria-hidden="true" />
            <span>精选副业</span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </header>

        {currentPageIntro ? (
          <section className={'v4-page-hero v4-page-hero-' + view}>
            <div>
              <p className="section-kicker">{currentPageIntro.kicker}</p>
              <h1>{currentPageIntro.title}</h1>
              <p>{currentPageIntro.description}</p>
            </div>
            <span className="v4-page-hero-mark" aria-hidden="true">
              {view === 'codex' ? (
                <Image
                  src={tibo.avatarUrl}
                  alt=""
                  width={76}
                  height={76}
                  unoptimized
                />
              ) : view === 'claude' || view === 'grok' ? (
                activeProvider.logoPath ? (
                  <Image
                    src={activeProvider.logoPath}
                    alt=""
                    width={76}
                    height={76}
                  />
                ) : null
              ) : view === 'tools' ? (
                <Gauge />
              ) : (
                <Info />
              )}
            </span>
          </section>
        ) : null}

        {view === 'home' ? (
          <section className="v5-home-intro reveal reveal-2" id="brief">
            <div className="v5-home-copy">
              <span className="v5-home-kicker">AI RESET INDEX · VERIFIED</span>
              <h1>
                Reset Relay
                <span>AI 额度重置追踪</span>
              </h1>
              <p>
                等一个 Reset，也等一个好消息。追踪 Codex、Claude 与 Grok
                的重置状态、历史记录和公开依据。
              </p>
              <a
                className="v5-latest-signal"
                href={latestAnnouncement.xUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span aria-hidden="true">
                  <Radio />
                </span>
                <span>
                  <small>最新核验</small>
                  <strong>{codexStatus.headline}</strong>
                </span>
                <time dateTime={latestAnnouncement.publishedAt}>
                  {formatPublishedTime(latestAnnouncement.publishedAt)}
                </time>
                <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
            <div className="v5-intro-actions">
              <RssDialog copied={rssCopied} onCopy={copyRssUrl} />
              <span>
                <Bell aria-hidden="true" /> 只提醒已核验变化
              </span>
            </div>
          </section>
        ) : null}

        {view === 'tools' ? (
          <section
            className="v4-compute-hub section-block"
            id="tools"
            aria-labelledby="compute-hub-title"
          >
            <div className="v2-section-heading v4-section-heading">
              <div>
                <p className="section-kicker">USEFUL NOW / AI COMPUTE</p>
                <h2 id="compute-hub-title">打开就能用的算力工具</h2>
              </div>
              <p>不需要注册，先算清楚、再决定。</p>
            </div>

            <div className="v4-tool-grid">
              <article className="v4-cost-card">
                <header>
                  <span className="v4-tool-icon">
                    <Calculator aria-hidden="true" />
                  </span>
                  <div>
                    <small>TOKEN COST CALCULATOR</small>
                    <h3>30 秒算出这个任务要花多少</h3>
                  </div>
                  <span className="v4-live-badge">已接官方价格</span>
                </header>

                <fieldset className="v4-model-selector" aria-label="选择模型">
                  {computeModels.map((model) => (
                    <button
                      type="button"
                      key={model.id}
                      aria-pressed={costModelId === model.id}
                      className={costModelId === model.id ? 'is-active' : ''}
                      onClick={() => setCostModelId(model.id)}
                    >
                      <span>{model.name}</span>
                      <small>{model.badge}</small>
                    </button>
                  ))}
                </fieldset>

                <div className="v4-calculator-body">
                  <div className="v4-cost-inputs">
                    <label>
                      <span>每次输入 Token</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={inputTokens}
                        onChange={(event) =>
                          setInputTokens(
                            Math.max(0, Number(event.target.value)),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>每次输出 Token</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={outputTokens}
                        onChange={(event) =>
                          setOutputTokens(
                            Math.max(0, Number(event.target.value)),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>每月执行次数</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={monthlyRuns}
                        onChange={(event) =>
                          setMonthlyRuns(
                            Math.max(0, Number(event.target.value)),
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="v4-cost-result" aria-live="polite">
                    <span>预估月成本</span>
                    <div>
                      <small>$</small>
                      <strong>{formattedTokenCost}</strong>
                      <em>USD</em>
                    </div>
                    <p>
                      {activeCostModel.name} · 输入 $
                      {activeCostModel.inputPerMillion}/M · 输出 $
                      {activeCostModel.outputPerMillion}/M
                    </p>
                    <a href={pricingSourceUrl} target="_blank" rel="noreferrer">
                      查看官方计价 <ExternalLink aria-hidden="true" />
                    </a>
                  </div>
                </div>
                <footer>
                  <Info aria-hidden="true" />
                  <span>
                    按短上下文、Standard
                    处理估算；工具调用和长上下文可能额外计费。
                  </span>
                </footer>
              </article>

              <div className="v4-opportunity-stack" id="opportunities">
                <article className="v4-opportunity-card">
                  <header>
                    <span className="v4-tool-icon is-gold">
                      <Gift aria-hidden="true" />
                    </span>
                    <div>
                      <small>VERIFIED OPPORTUNITIES</small>
                      <h3>今日算力机会</h3>
                    </div>
                    <strong>{computeOpportunities.length}</strong>
                  </header>
                  <div className="v4-opportunity-list">
                    {computeOpportunities.map((opportunity) => (
                      <a
                        key={opportunity.id}
                        href={opportunity.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={'is-' + opportunity.category}
                      >
                        <span className="v4-opportunity-number">
                          {opportunity.category === 'free' ? (
                            <Gift aria-hidden="true" />
                          ) : opportunity.category === 'reset' ? (
                            <Radio aria-hidden="true" />
                          ) : (
                            <TrendingDown aria-hidden="true" />
                          )}
                        </span>
                        <span>
                          <small>{opportunity.eyebrow}</small>
                          <strong>{opportunity.title}</strong>
                          <p>{opportunity.description}</p>
                          <em>{opportunity.eligibility}</em>
                        </span>
                        <ArrowUpRight aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                  <footer>
                    <ShieldCheck aria-hidden="true" />
                    <span>只收录能回到官方或一手来源的信息。</span>
                  </footer>
                </article>

                <article className="v4-limit-card">
                  <header>
                    <span className="v4-tool-icon is-violet">
                      <BookOpen aria-hidden="true" />
                    </span>
                    <div>
                      <small>LIMIT GUIDE</small>
                      <h3>三个平台的额度规则，先放在一起</h3>
                    </div>
                  </header>
                  <div className="v4-limit-row">
                    {providerCatalog.map((provider) => (
                      <Link href={'/' + provider.id} key={provider.id}>
                        <span>{provider.name}</span>
                        <strong>{provider.metrics[0].detail}</strong>
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          </section>
        ) : null}

        {view === 'home' ? (
          <section
            className="v5-provider-section reveal reveal-3"
            id="overview"
            aria-labelledby="providers-title"
          >
            <div className="v5-section-heading">
              <div>
                <p className="section-kicker">THREE PLATFORMS / ONE INDEX</p>
                <h2 id="providers-title">先看状态，再看依据</h2>
              </div>
              <p>点击卡片进入各平台的独立页面。</p>
            </div>

            <div className="v5-platform-showcase">
              {providerCatalog.map((provider) => {
                const isCodex = provider.id === 'codex';
                const presentation = providerPresentation[provider.id];
                return (
                  <article
                    className={'v5-platform-item is-' + presentation.tone}
                    key={provider.id}
                  >
                    <Link className="v5-platform-card" href={'/' + provider.id}>
                      <span className="v5-card-heading">
                        <span>
                          <strong>{provider.name}</strong>
                          <small>{presentation.figure}</small>
                        </span>
                        <span className="v5-card-logo" aria-hidden="true">
                          {isCodex ? (
                            <Image
                              src={tibo.avatarUrl}
                              alt=""
                              width={38}
                              height={38}
                              unoptimized
                            />
                          ) : provider.logoPath ? (
                            <Image
                              src={provider.logoPath}
                              alt=""
                              width={24}
                              height={24}
                            />
                          ) : (
                            provider.mark
                          )}
                        </span>
                      </span>
                      <Image
                        className="v5-card-art"
                        src={presentation.artwork}
                        alt={`${presentation.figure} 的编辑插画，用于区分 ${provider.name} 信息源`}
                        width={800}
                        height={1000}
                        sizes="(max-width: 760px) 76vw, 330px"
                        priority={isCodex}
                      />
                      <span className="v5-card-footer">
                        <span className="v5-platform-status">
                          <small>{isCodex ? '公开状态' : '账户状态'}</small>
                          <strong>
                            {isCodex ? codexStatus.headline : '等待本机接入'}
                          </strong>
                          <span
                            className={isCodex ? 'is-confirmed' : 'is-pending'}
                            aria-hidden="true"
                          >
                            {isCodex ? <Check /> : null}
                          </span>
                          <em>
                            {isCodex
                              ? formatPublishedTime(tiboPostsVerifiedAt) +
                                ' 已核验'
                              : provider.cardHeadline}
                          </em>
                        </span>
                        <span className="v5-card-source">
                          <span>
                            <small>{presentation.sourceRole}</small>
                            <strong>{provider.sourceLabel}</strong>
                          </span>
                          <ArrowUpRight aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  </article>
                );
              })}
            </div>
            <p className="v5-illustration-note">
              人物插画用于区分信息来源，不代表本人或平台背书；状态以公开原帖与本机数据为准。
            </p>
          </section>
        ) : null}

        {view === 'home' ? (
          <section className="v5-reset-ledger" aria-labelledby="ledger-title">
            <header>
              <div>
                <p className="section-kicker">RESET LEDGER / VERIFIED</p>
                <h2 id="ledger-title">最近重置记录</h2>
              </div>
              <Link href="/codex">
                查看完整记录 <ArrowRight aria-hidden="true" />
              </Link>
            </header>

            <div className="v5-ledger-profile">
              <TiboAvatar compact />
              <span>
                <strong>Codex</strong>
                <small>来源：Tibo 公开原帖</small>
              </span>
              <em>最近核验 {formatPublishedTime(tiboPostsVerifiedAt)}</em>
            </div>

            <div className="v5-ledger-stats">
              <article className="is-highlighted">
                <small>当前状态</small>
                <strong>{codexStatus.headline}</strong>
                <span>
                  <CheckCircle2 aria-hidden="true" /> 已核验
                </span>
              </article>
              <article>
                <small>上次重置</small>
                <strong>{latestAnnouncement.date.slice(5)}</strong>
                <span>
                  {formatPublishedTime(latestAnnouncement.publishedAt)
                    .split(' ')
                    .at(-1)}
                </span>
              </article>
              <article>
                <small>历史平均</small>
                <strong>{resetStats.averageDays} 天</strong>
                <span>{resetStats.windowWeeks} 周样本</span>
              </article>
              <article>
                <small>已核验记录</small>
                <strong>{resetStats.total} 次</strong>
                <span>最长等待 {resetStats.longestDays} 天</span>
              </article>
            </div>

            <table className="v5-ledger-table">
              <caption className="sr-only">最近三条重置公告</caption>
              <thead>
                <tr className="v5-ledger-row is-head">
                  <th scope="col">日期</th>
                  <th scope="col">类型</th>
                  <th scope="col">结论</th>
                  <th scope="col">原帖</th>
                </tr>
              </thead>
              <tbody>
                {announcements.slice(0, 3).map((announcement) => (
                  <tr className="v5-ledger-row" key={announcement.id}>
                    <td aria-label={`日期 ${announcement.date.slice(5)}`}>
                      <time dateTime={announcement.publishedAt}>
                        <strong>{announcement.date.slice(5)}</strong>
                        <small>
                          {formatPublishedTime(announcement.publishedAt)
                            .split(' ')
                            .at(-1)}
                        </small>
                      </time>
                    </td>
                    <td>
                      <em>{kindMeta[announcement.kind].label}</em>
                    </td>
                    <td>{announcement.title}</td>
                    <td>
                      <a
                        href={announcement.xUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`查看 ${announcement.title} 原帖`}
                      >
                        <ArrowUpRight aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {view === 'home' ? (
          <section
            className="v4-conversion-card"
            aria-labelledby="conversion-title"
          >
            <div className="v4-conversion-icon" aria-hidden="true">
              <Radio />
            </div>
            <div className="v4-conversion-copy">
              <p className="section-kicker">QUIET ALERTS / ZERO NOISE</p>
              <h2 id="conversion-title">真正重要的变化，别再靠刷群等到。</h2>
              <p>
                先免费订阅已核验的重置公告。以后价格下调、免费额度和限额变化，也只推送与你有关、能回到原始来源的消息。
              </p>
              <div className="v4-conversion-points">
                <span>
                  <CheckCircle2 /> 只发高价值变化
                </span>
                <span>
                  <ShieldCheck /> 不要密码与账户权限
                </span>
                <span>
                  <Clock3 /> 随时取消
                </span>
              </div>
            </div>
            <div className="v4-conversion-actions">
              <RssDialog copied={rssCopied} onCopy={copyRssUrl} />
              <button type="button" onClick={copyWechatContact}>
                <MessageCircle aria-hidden="true" />
                {wechatCopied ? '微信号已复制' : '登记优先提醒'}
              </button>
              <Link href="/side-hustles">
                顺便看精选副业 <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : null}

        {view === 'codex' || view === 'claude' || view === 'grok' ? (
          <section
            className={
              'v2-provider-detail provider-detail-' + activeProvider.id
            }
            aria-live="polite"
            aria-label={activeProvider.name + ' 重置详情'}
          >
            {activeProvider.id === 'codex' ? (
              <>
                <div className="v2-result-panel">
                  <div className="v2-result-header">
                    <div>
                      <span
                        className={'v2-status-pill tone-' + codexStatus.tone}
                      >
                        <Radio aria-hidden="true" /> {codexStatus.label}
                      </span>
                      <p>CODEX / OPENAI</p>
                    </div>
                    <span className="v2-source-chip">
                      <TiboAvatar compact />
                      <span>
                        <strong>Tibo</strong>
                        <small>公开来源</small>
                      </span>
                    </span>
                  </div>
                  <h2>{codexStatus.headline}</h2>
                  <p className="v2-result-summary">{codexStatus.detail}</p>

                  <div className="v2-result-actions">
                    <UsageDialog />
                    <a
                      className="v2-source-link"
                      href={
                        activeOfficialPreview?.url ?? latestAnnouncement.xUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      查看原帖 <ExternalLink aria-hidden="true" />
                    </a>
                    {publicResetState.kind === 'confirmed' &&
                    latestAnnouncement.screenshotUrl ? (
                      <ResetShareCard
                        kind={latestAnnouncement.kind}
                        publishedAt={latestAnnouncement.publishedAt}
                        sourceScreenshotUrl={latestAnnouncement.screenshotUrl}
                        sourceUrl={latestAnnouncement.xUrl}
                        verifiedAt={tiboPostsVerifiedAt}
                      />
                    ) : null}
                  </div>

                  {activeOfficialPreview ? (
                    <article className="v2-evidence-card">
                      <header>
                        <span>
                          <Sparkles aria-hidden="true" /> 官方预告证据
                        </span>
                        <time dateTime={activeOfficialPreview.publishedAt}>
                          {formatPublishedTime(
                            activeOfficialPreview.publishedAt,
                          )}
                        </time>
                      </header>
                      <blockquote>
                        “
                        {activeOfficialPreview.preview?.translation ??
                          activeOfficialPreview.summary}
                        ”
                      </blockquote>
                      <footer>
                        <a
                          href={activeOfficialPreview.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          查看 X 原帖 <ExternalLink aria-hidden="true" />
                        </a>
                        <button type="button" onClick={copyOfficialPreview}>
                          {previewCopied ? <Check /> : <Copy />}
                          {previewCopied ? '已复制' : '复制内容'}
                        </button>
                      </footer>
                    </article>
                  ) : (
                    <div className="v2-latest-proof">
                      <CheckCircle2 aria-hidden="true" />
                      <span>
                        <small>最近一次明确公告</small>
                        <strong>{latestAnnouncement.title}</strong>
                      </span>
                      <time dateTime={latestAnnouncement.publishedAt}>
                        {formatPublishedTime(latestAnnouncement.publishedAt)}
                      </time>
                    </div>
                  )}
                </div>

                <aside className="v2-insight-panel">
                  <div className="v2-radar-block">
                    <div className="v2-radar-copy">
                      <span>
                        <span
                          className="provider-live-dot"
                          aria-hidden="true"
                        />
                        雷达在线
                      </span>
                      <strong>持续核验公开信号</strong>
                      <small>只有明确公告才会改变结论</small>
                    </div>
                    <div className="radar-orbit v2-radar" aria-hidden="true">
                      <div className="orbit-ring orbit-ring-1" />
                      <div className="orbit-ring orbit-ring-2" />
                      <div className="orbit-axis orbit-axis-x" />
                      <div className="orbit-axis orbit-axis-y" />
                      <div className="orbit-sweep" />
                      <span className="orbit-blip orbit-blip-a" />
                      <span className="orbit-blip orbit-blip-b" />
                      <div className="orbit-center">
                        <Radio />
                      </div>
                    </div>
                  </div>

                  <div className="v2-probability">
                    <div className="v2-probability-heading">
                      <span>历史模型参考</span>
                      <strong>
                        {probabilityModel.isCooldown
                          ? '冷却观察'
                          : probabilityModel.probability + '%'}
                      </strong>
                    </div>
                    <div className="v2-probability-track" aria-hidden="true">
                      <span
                        style={{
                          width: probabilityModel.isCooldown
                            ? '12%'
                            : probabilityModel.probability + '%',
                        }}
                      />
                    </div>
                    <p>
                      {probabilityModel.isCooldown
                        ? '本轮已经确认，不再重复预测。'
                        : '趋势参考，不代表官方承诺。'}
                    </p>
                    <details>
                      <summary>
                        <Info aria-hidden="true" /> 为什么这样判断？
                      </summary>
                      <p>
                        根据已核验的历史间隔和公开信号计算；普通动态不会进入重置信号。
                      </p>
                    </details>
                  </div>

                  <div className="v2-inline-stats" aria-label="Codex 重置统计">
                    <div>
                      <span>公开记录</span>
                      <strong>{resetStats.total} 次</strong>
                    </div>
                    <div>
                      <span>平均间隔</span>
                      <strong>{resetStats.averageDays} 天</strong>
                    </div>
                    <div>
                      <span>近 24h 信号</span>
                      <strong>{recentSignalCount} 条</strong>
                    </div>
                  </div>
                </aside>
              </>
            ) : (
              <div className="v2-connecting-panel">
                <span
                  className={'provider-mark provider-mark-' + activeProvider.id}
                >
                  {activeProvider.logoPath ? (
                    <Image
                      className="provider-logo"
                      src={activeProvider.logoPath}
                      alt=""
                      width={72}
                      height={72}
                    />
                  ) : (
                    activeProvider.mark
                  )}
                </span>
                <div>
                  <span className="v2-connecting-label">
                    本机采集方案 · 未连接
                  </span>
                  <h2>{activeProvider.name} 在 Mac 本机安全接入</h2>
                  <p>{activeProvider.description}</p>
                  {activeProvider.localSetup ? (
                    <ol
                      className="v5-local-setup"
                      aria-label={activeProvider.name + ' 本机接入步骤'}
                    >
                      <li>
                        <span>01</span>
                        <div>
                          <strong>安装并登录官方工具</strong>
                          <p>
                            在你的 Mac 运行{' '}
                            <code>
                              {activeProvider.localSetup.signInCommand}
                            </code>
                            ，只在本机完成授权。
                          </p>
                        </div>
                      </li>
                      <li>
                        <span>02</span>
                        <div>
                          <strong>本机采集与脱敏</strong>
                          <p>{activeProvider.localSetup.collectorNote}</p>
                        </div>
                      </li>
                      <li>
                        <span>03</span>
                        <div>
                          <strong>网站只读安全快照</strong>
                          <p>{activeProvider.localSetup.publicFields}</p>
                        </div>
                      </li>
                    </ol>
                  ) : null}
                  <div
                    className="v2-provider-metrics"
                    aria-label={activeProvider.name + ' 可读取数据'}
                  >
                    {activeProvider.metrics.map((metric) => (
                      <span key={metric.label}>
                        <small>{metric.label}</small>
                        <strong>{metric.detail}</strong>
                      </span>
                    ))}
                  </div>
                  <div className="v2-connecting-rule">
                    <ShieldCheck aria-hidden="true" />
                    <span>
                      <strong>账户凭证不会进入网站或 GitHub。</strong>
                      <small>{activeProvider.privacyNote}</small>
                    </span>
                  </div>
                  <a
                    className="v2-provider-source"
                    href={activeProvider.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看采集依据 · {activeProvider.sourceLicense}
                    <ExternalLink aria-hidden="true" />
                  </a>
                </div>
                <Link className="v2-provider-jump" href="/codex">
                  先看 Codex <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            )}
          </section>
        ) : null}

        {view === 'codex' ? (
          <>
            <section
              className="history-section section-block reveal reveal-4"
              id="history"
              aria-labelledby="history-title"
            >
              <div className="section-heading">
                <div>
                  <p className="section-kicker">RESET MAP / 26 WEEKS</p>
                  <h2 id="history-title">Codex 重置历史</h2>
                </div>
                <div className="legend" aria-label="图例">
                  {(Object.keys(kindMeta) as ResetKind[]).map((kind) => (
                    <span key={kind}>
                      <i className={'legend-dot kind-' + kind} />
                      {kindMeta[kind].label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="filter-bar" aria-label="筛选重置类型">
                {filters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={
                      filter === item.value
                        ? 'filter-chip is-active'
                        : 'filter-chip'
                    }
                    aria-pressed={filter === item.value}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="heatmap-card">
                <div className="heatmap-layout">
                  <div className="day-labels" aria-hidden="true">
                    <span>周一</span>
                    <span>周三</span>
                    <span>周五</span>
                  </div>
                  <div className="heatmap-scroll">
                    <div className="heatmap-months" aria-hidden="true">
                      {heatmapMonths.map((month) => (
                        <span key={month}>{month}</span>
                      ))}
                    </div>
                    <div className="heatmap-weeks">
                      {heatmapWeeks.map((week, weekIndex) => (
                        <div className="heatmap-week" key={weekIndex}>
                          {week.map((date) => {
                            const event = eventMap.get(date);
                            const isMuted =
                              event &&
                              filter !== 'all' &&
                              event.kind !== filter;
                            const isSelected = selectedEvent.date === date;
                            const label = event
                              ? formatChineseDate(date) +
                                '，' +
                                kindMeta[event.kind].label
                              : formatChineseDate(date) + '，无公告';
                            return (
                              <button
                                type="button"
                                key={date}
                                aria-label={label}
                                aria-pressed={isSelected}
                                disabled={!event}
                                onClick={() => event && setSelectedEvent(event)}
                                className={[
                                  'heat-cell',
                                  event ? 'kind-' + event.kind : '',
                                  isMuted ? 'is-muted' : '',
                                  isSelected ? 'is-selected' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="selected-event" aria-live="polite">
                  <span className={'selected-icon kind-' + selectedEvent.kind}>
                    {kindMeta[selectedEvent.kind].emoji}
                  </span>
                  <div>
                    <span>当前选中</span>
                    <strong>{formatChineseDate(selectedEvent.date)}</strong>
                  </div>
                  <em>{kindMeta[selectedEvent.kind].label}</em>
                </div>
              </div>
            </section>

            <section
              className="posts-section section-block"
              id="signals"
              aria-labelledby="posts-title"
            >
              <div className="section-heading posts-heading">
                <div>
                  <p className="section-kicker">
                    VERIFIED CASES / SOURCE PROOF
                  </p>
                  <h2 id="posts-title">真实公告案例</h2>
                </div>
                <p>每条结论都能回到公开原帖。</p>
              </div>

              <div className="posts-layout">
                <div className="tibo-feed-panel">
                  <div className="v3-evidence-showcase">
                    <article className="v3-evidence-feature">
                      <div className="v3-evidence-image">
                        <Image
                          src={
                            latestAnnouncement.screenshotUrl ??
                            '/share/tibo-reset-post-source-2026-09-23.jpg'
                          }
                          alt="Tibo 最近一次重置公告原帖截图"
                          width={1200}
                          height={675}
                        />
                        <span>真实原帖截图</span>
                      </div>
                      <div className="v3-evidence-copy">
                        <span className="v3-case-label">
                          {kindMeta[latestAnnouncement.kind].label}
                        </span>
                        <h3>{latestAnnouncement.title}</h3>
                        <p>{latestAnnouncement.summary}</p>
                        <footer>
                          <time dateTime={latestAnnouncement.publishedAt}>
                            {formatPublishedTime(
                              latestAnnouncement.publishedAt,
                            )}
                          </time>
                          <a
                            href={latestAnnouncement.xUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            查看证据 <ArrowUpRight aria-hidden="true" />
                          </a>
                        </footer>
                      </div>
                    </article>

                    <div className="v3-evidence-list">
                      {announcements.slice(1, 3).map((announcement, index) => (
                        <a
                          className="v3-evidence-mini"
                          href={announcement.xUrl}
                          target="_blank"
                          rel="noreferrer"
                          key={announcement.id}
                        >
                          <span className="v3-mini-number">
                            {String(index + 2).padStart(2, '0')}
                          </span>
                          <span>
                            <small>{kindMeta[announcement.kind].label}</small>
                            <strong>{announcement.title}</strong>
                            <time dateTime={announcement.publishedAt}>
                              {formatPublishedTime(announcement.publishedAt)}
                            </time>
                          </span>
                          <ArrowUpRight aria-hidden="true" />
                        </a>
                      ))}
                      <div className="v3-case-note">
                        <ShieldCheck aria-hidden="true" />
                        <span>
                          <strong>不是传闻，是可核验的案例</strong>
                          <small>
                            时间、类型、原帖缺一项就不会作为确认结果。
                          </small>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="v3-feed-heading">
                    <div>
                      <p className="section-kicker">SOURCE FEED / TIBO</p>
                      <h3>最新公开动态</h3>
                    </div>
                    <span>默认 3 条重点 · 共核验 {tiboPosts.length} 条</span>
                  </div>
                  <div className="profile-note">
                    <a href={tibo.profileUrl} target="_blank" rel="noreferrer">
                      <TiboAvatar compact />
                    </a>
                    <div>
                      <strong>{tibo.name}</strong>
                      <span>{tibo.role} · 公开原帖</span>
                    </div>
                    <Sparkles aria-hidden="true" />
                  </div>

                  <div className="tibo-post-list">
                    {visibleTiboPosts.map((post) => {
                      const index = tiboPosts.findIndex(
                        (candidate) => candidate.id === post.id,
                      );
                      const signal = signalMeta[post.resetSignal];
                      return (
                        <article className="tibo-post-row" key={post.id}>
                          <span className="post-index" aria-hidden="true">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <a
                            className="tibo-post-card"
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            style={
                              {
                                '--item-delay': String(index * 45) + 'ms',
                              } as CSSProperties
                            }
                          >
                            <div className="tibo-post-meta">
                              <span className="post-category">
                                {post.category}
                              </span>
                              <span
                                className={'post-signal ' + signal.className}
                              >
                                {signal.label}
                              </span>
                              <time dateTime={post.publishedAt}>
                                {formatRelativeTime(post.publishedAt)} ·{' '}
                                {formatPublishedTime(post.publishedAt)}
                              </time>
                              <ExternalLink aria-hidden="true" />
                            </div>
                            <h3>{post.title}</h3>
                            <p>{post.summary}</p>
                          </a>
                        </article>
                      );
                    })}
                  </div>
                  <button
                    className="tibo-feed-toggle"
                    type="button"
                    aria-expanded={showAllPosts}
                    onClick={() => setShowAllPosts((current) => !current)}
                  >
                    {showAllPosts
                      ? '收起，只看重点动态'
                      : '查看全部 ' + tiboPosts.length + ' 条动态'}
                    <ArrowUpRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {view === 'tools' ? (
          <section className="v4-tools-grid" aria-label="重置实用工具">
            <article>
              <span className="v4-tool-icon is-green">
                <Gauge aria-hidden="true" />
              </span>
              <p className="section-kicker">USAGE CHECK</p>
              <h2>检查我的额度</h2>
              <p>30 秒找到真实剩余额度和个人重置时间。</p>
              <UsageDialog />
            </article>
            <article>
              <span className="v4-tool-icon is-yellow">
                <Rss aria-hidden="true" />
              </span>
              <p className="section-kicker">QUIET ALERTS</p>
              <h2>免费接收提醒</h2>
              <p>只在出现明确公告时更新，不用反复刷新页面。</p>
              <RssDialog copied={rssCopied} onCopy={copyRssUrl} />
            </article>
            <article>
              <span className="v4-tool-icon is-orange">
                <Sparkles aria-hidden="true" />
              </span>
              <p className="section-kicker">SHARE CARD</p>
              <h2>生成重置分享卡</h2>
              <p>把原帖证据、网站和二维码整理成一张可信卡片。</p>
              <ResetShareCard
                kind={latestAnnouncement.kind}
                publishedAt={latestAnnouncement.publishedAt}
                sourceScreenshotUrl={
                  latestAnnouncement.screenshotUrl ??
                  '/share/tibo-reset-post-source-2026-09-23.jpg'
                }
                sourceUrl={latestAnnouncement.xUrl}
                verifiedAt={tiboPostsVerifiedAt}
              />
            </article>
          </section>
        ) : null}

        {view === 'knowledge' ? (
          <>
            <section
              className="v3-faq section-block"
              aria-labelledby="faq-title"
            >
              <div className="section-heading">
                <div>
                  <p className="section-kicker">PLAIN ANSWERS / FAQ</p>
                  <h2 id="faq-title">先把“算力”说清楚</h2>
                </div>
                <p>不夸大，也不把预测当事实。</p>
              </div>
              <div className="v3-faq-grid">
                <details open>
                  <summary>网站显示重置，我的账户就一定恢复了吗？</summary>
                  <p>
                    不一定。这里记录的是官方公开公告；你的剩余额度和个人重置时间，仍以
                    Usage 页面为准。
                  </p>
                </details>
                <details>
                  <summary>“额度重置”和“重置次数”有什么区别？</summary>
                  <p>
                    额度重置通常会直接生效；重置次数会发到符合条件的账户中，需要你自己在产品内使用。
                  </p>
                </details>
                <details>
                  <summary>Token 计算器的价格从哪里来？</summary>
                  <p>
                    来自 OpenAI 官方 API 计价页，当前按短上下文、Standard
                    处理估算。官方价格变化后，需要重新核验再更新。
                  </p>
                </details>
              </div>
            </section>

            <section
              className="prayer-card v2-prayer"
              aria-labelledby="prayer-title"
            >
              <div className="prayer-copy">
                <p className="section-kicker">RESET WISH / GOOD LUCK</p>
                <h2 id="prayer-title">一起等下一次重置</h2>
                <p>
                  点一下，为下一次额度重置攒点好运。次数只保存在你的浏览器。
                </p>
              </div>
              <div
                className="prayer-counter"
                aria-busy={!prayerReady}
                aria-live="polite"
              >
                <span>本设备已祈愿</span>
                <div>
                  <strong>{prayerReady ? prayerCount : '—'}</strong>
                  <small>次</small>
                </div>
              </div>
              <button
                className="prayer-button"
                type="button"
                onClick={recordPrayer}
                disabled={!prayerReady}
              >
                <span aria-hidden="true">🙏</span>
                祈愿一次
              </button>
            </section>
          </>
        ) : null}

        <footer className="site-footer">
          <div className="footer-primary">
            <p>
              公开记录均可直达原帖 · 最近数据{' '}
              {formatChineseDate(toShanghaiDateKey(tiboPostsVerifiedAt))} · 与
              OpenAI、Anthropic、xAI 无隶属关系
            </p>
            <button
              className="footer-contact"
              type="button"
              onClick={copyWechatContact}
              aria-label="复制站长微信号 7547211"
            >
              <MessageCircle aria-hidden="true" />
              {wechatCopied ? '微信号已复制' : '联系站长 · 微信：7547211'}
              <Copy aria-hidden="true" />
            </button>
          </div>
          <p className="footer-disclaimer">
            历史规律只用于参考，个人额度请始终以对应产品内显示为准。
          </p>
        </footer>
      </div>
    </main>
  );
}
