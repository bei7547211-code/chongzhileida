'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gauge,
  Info,
  MessageCircle,
  Radio,
  Rss,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  announcements,
  kindMeta,
  monitor,
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
import { toShanghaiDateKey } from '@/lib/time';

type FilterKind = 'all' | ResetKind;

const filters: { value: FilterKind; label: string }[] = [
  { value: 'all', label: '全部记录' },
  { value: 'full', label: '额度重置' },
  { value: 'banked', label: '重置卡' },
  { value: 'signal', label: '重置信号' },
];

const latestAnnouncement = announcements[0];
const publicRssUrl = 'https://www.resetrelay.com/feed.xml';
const prayerStorageKey = 'reset-relay-prayer-count';
const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;
const dailyScanTimes = [...monitor.scheduleLabel.matchAll(/(\d{1,2}):(\d{2})/g)]
  .map((match) => ({ hour: Number(match[1]), minute: Number(match[2]) }))
  .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
const scanTimes = dailyScanTimes.length
  ? dailyScanTimes
  : [{ hour: 15, minute: 0 }];
const probabilityModel = calculateResetProbability(
  resetEvents,
  tiboPosts,
  tiboPostsVerifiedAt,
);

type ScanCountdown = {
  hours: string;
  minutes: string;
  seconds: string;
  targetDate: string;
  targetTime: string;
};

const emptyCountdown: ScanCountdown = {
  hours: '--',
  minutes: '--',
  seconds: '--',
  targetDate: '下一次',
  targetTime: '--:--',
};

const signalMeta: Record<
  TiboResetSignal,
  { label: string; className: string }
> = {
  confirmed: { label: '确认重置', className: 'is-confirmed' },
  related: { label: '相关信号', className: 'is-related' },
  none: { label: '普通动态', className: 'is-neutral' },
};

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createHeatmapWeeks(asOf: string) {
  const currentDay = new Date(`${toShanghaiDateKey(asOf)}T00:00:00.000Z`);
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
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
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
  return `${relative.value}${relative.unit ? ` ${relative.unit}` : ''}`;
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

function getNextScanCountdown(now: Date): ScanCountdown {
  const shanghaiNow = new Date(now.getTime() + shanghaiOffsetMs);
  const todayStart = Date.UTC(
    shanghaiNow.getUTCFullYear(),
    shanghaiNow.getUTCMonth(),
    shanghaiNow.getUTCDate(),
  );
  const todayCandidates = scanTimes.map(
    ({ hour, minute }) =>
      todayStart + (hour * 60 + minute) * 60_000 - shanghaiOffsetMs,
  );
  const targetTime =
    todayCandidates.find((candidate) => candidate > now.getTime()) ??
    todayCandidates[0] + dayMs;

  const totalSeconds = Math.max(
    0,
    Math.ceil((targetTime - now.getTime()) / 1000),
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const targetDate = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(targetTime));
  const targetTimeLabel = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(targetTime));

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    targetDate,
    targetTime: targetTimeLabel,
  };
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

export function ResetDashboard() {
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
  const [countdown, setCountdown] = useState<ScanCountdown>(emptyCountdown);
  const heatmapWeeks = useMemo(
    () => createHeatmapWeeks(tiboPostsVerifiedAt),
    [],
  );
  const heatmapMonths = useMemo(
    () =>
      [...new Set(heatmapWeeks.flat().map((date) => date.slice(0, 7)))].map(
        (month) => `${Number(month.slice(5, 7))}月`,
      ),
    [heatmapWeeks],
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
  const recentSignalCount = tiboPosts.filter(
    (post) =>
      post.resetSignal !== 'none' &&
      Date.parse(tiboPostsVerifiedAt) - Date.parse(post.publishedAt) <= dayMs,
  ).length;
  const highlightedPosts = useMemo(() => {
    const ids = new Set(tiboPosts.slice(0, 5).map((post) => post.id));
    const notablePost = tiboPosts.find((post) => post.resetSignal !== 'none');
    if (notablePost) ids.add(notablePost.id);
    return tiboPosts.filter((post) => ids.has(post.id));
  }, []);
  const visibleTiboPosts = showAllPosts ? tiboPosts : highlightedPosts;
  const eventMap = useMemo(
    () => new Map(resetEvents.map((event) => [event.date, event])),
    [],
  );

  useEffect(() => {
    const updateCountdown = () =>
      setCountdown(getNextScanCountdown(new Date()));
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    return () => {
      window.clearTimeout(loadTimer);
    };
  }, []);

  async function copyRssUrl() {
    await navigator.clipboard.writeText(publicRssUrl);
    setRssCopied(true);
    window.setTimeout(() => setRssCopied(false), 2200);
  }

  async function copyOfficialPreview() {
    if (!activeOfficialPreview) return;
    await navigator.clipboard.writeText(
      `${activeOfficialPreview.title}\n${activeOfficialPreview.summary}\n${activeOfficialPreview.url}`,
    );
    setPreviewCopied(true);
    window.setTimeout(() => setPreviewCopied(false), 2200);
  }

  function chooseFilter(nextFilter: FilterKind) {
    setFilter(nextFilter);
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
    <main className="radar-page">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-b" aria-hidden="true" />

      <div className="page-shell">
        <header className="site-header reveal reveal-1">
          <a
            className="profile-lockup"
            href={tibo.profileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="在 X 查看 Tibo 的主页"
          >
            <TiboAvatar />
            <div>
              <h1 className="brand-title">Codex 重置雷达</h1>
              <span className="profile-line">
                <strong>Tibo</strong>
                <span>{tibo.handle}</span>
                <ArrowUpRight aria-hidden="true" />
              </span>
            </div>
          </a>

          <Link
            className="header-status"
            href="/side-hustles"
            aria-label="查看精选副业真实案例库"
          >
            <span className="header-status-badge">
              <span className="status-dot" aria-hidden="true" />
              NEW
            </span>
            <span className="header-status-copy">
              <strong>精选副业</strong>
              <small>点击查看真实案例</small>
            </span>
            <span className="header-status-arrow" aria-hidden="true">
              <ArrowUpRight />
            </span>
          </Link>
        </header>

        <section className="intro reveal reveal-2">
          <p>
            我们关注{' '}
            <a href={tibo.profileUrl} target="_blank" rel="noreferrer">
              {tibo.handle}
            </a>{' '}
            的 Codex 重置公告，替你从噪音里找到真正的信号。
          </p>
          <div className="intro-actions">
            <Dialog>
              <DialogTrigger
                render={<Button size="lg" className="pill-action" />}
              >
                <Gauge aria-hidden="true" /> 检查我的额度
              </DialogTrigger>
              <DialogContent className="core-dialog">
                <DialogHeader>
                  <span className="dialog-icon" aria-hidden="true">
                    <Gauge />
                  </span>
                  <DialogTitle>30 秒确认你的真实额度</DialogTitle>
                  <DialogDescription>
                    公共重置不等于每个账户的剩余额度，最终以你的 Usage
                    页面为准。
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

            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="lg"
                    className="secondary-action"
                  />
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

                <div className="rss-explainer">
                  <strong>你会收到什么？</strong>
                  <p>
                    只有 Tibo
                    明确说“额度已经重置”或“发放重置卡”时，我们才会更新提醒。
                  </p>
                </div>

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
                  <span>先复制这条订阅地址</span>
                  <div className="rss-address">
                    <code>resetrelay.com/feed.xml</code>
                    <Button type="button" size="sm" onClick={copyRssUrl}>
                      {rssCopied ? <Check /> : <Copy />}
                      {rssCopied ? '复制成功' : '复制地址'}
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
                      <div>打开任意订阅工具，例如 Feedly 或 NetNewsWire。</div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>找到“添加来源”或“添加订阅”，粘贴地址并确认。</div>
                    </li>
                  </ol>
                </div>

                <div className="rss-reader-links" aria-label="推荐订阅工具">
                  <span>没有订阅工具？</span>
                  <a
                    href="https://feedly.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    网页版 Feedly <ExternalLink aria-hidden="true" />
                  </a>
                  <a
                    href="https://netnewswire.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    苹果设备 NetNewsWire <ExternalLink aria-hidden="true" />
                  </a>
                </div>
                <p className="dialog-note">
                  提醒会出现在订阅工具里，不会直接发送短信或微信消息。全程不需要在本站登录。
                </p>
              </DialogContent>
            </Dialog>

            <span className="privacy-note">
              <ShieldCheck aria-hidden="true" /> 无需登录 · 不读取你的账户
            </span>
          </div>
        </section>

        <section
          className={`latest-card reveal reveal-3${
            activeOfficialPreview ? ' has-official-preview' : ''
          }`}
          aria-labelledby="latest-title"
        >
          <div className="card-grid-pattern" aria-hidden="true" />
          {!activeOfficialPreview ? (
            <section
              className={`public-reset-state state-${publicResetState.kind}`}
            >
              <span className="public-reset-icon" aria-hidden="true">
                {publicResetState.kind === 'confirmed' ? (
                  <CheckCircle2 />
                ) : (
                  <Radio />
                )}
              </span>
              <div className="public-reset-copy">
                <span>
                  当前结论 · {formatPublishedTime(tiboPostsVerifiedAt)} 核验
                </span>
                <h2 id="latest-title">
                  {publicResetState.kind === 'confirmed'
                    ? `${kindMeta[latestAnnouncement.kind].label}已发放 · ${formatRelativeTime(latestAnnouncement.publishedAt)}`
                    : '暂未发现新的公开重置'}
                </h2>
                <p>
                  {publicResetState.kind === 'confirmed'
                    ? 'Tibo 已明确发布公告。现在请到 Usage 页面核对你的个人额度。'
                    : '雷达会继续核对 Tibo 原帖，普通动态不会被误报为重置。'}
                </p>
              </div>
              <a
                href={latestAnnouncement.xUrl}
                target="_blank"
                rel="noreferrer"
              >
                查看原帖 <ExternalLink aria-hidden="true" />
              </a>
            </section>
          ) : null}
          {activeOfficialPreview ? (
            <article className="official-preview">
              <header className="official-preview-head">
                <span className="official-preview-kicker">
                  <Sparkles aria-hidden="true" /> TIBO OFFICIAL SIGNAL
                </span>
                <span className="official-preview-verified">
                  <span aria-hidden="true" />
                  {formatPublishedTime(activeOfficialPreview.publishedAt)} 核验
                </span>
              </header>

              <div className="official-preview-layout">
                <section className="official-preview-forecast">
                  <span className="official-preview-label">官方预告信号</span>
                  <h2 id="latest-title">
                    {activeOfficialPreview.preview?.headline ??
                      activeOfficialPreview.title}
                  </h2>
                  <div className="official-preview-date">
                    <strong>
                      {activeOfficialPreview.preview?.dateLabel ?? '近期'}
                    </strong>
                    <span>
                      {activeOfficialPreview.preview?.dayLabel ?? '待确认'}
                    </span>
                  </div>
                  <p>
                    {activeOfficialPreview.preview?.timingLabel ??
                      '尚未公布具体时刻'}
                    ，雷达会继续核对完成公告。
                  </p>
                  <div className="official-preview-status">
                    <span aria-hidden="true" />
                    {publicResetState.kind === 'overdue'
                      ? '预告日期已到，等待完成确认'
                      : '等待完成确认'}
                  </div>
                </section>

                <section className="official-preview-evidence">
                  <header className="official-preview-author">
                    <TiboAvatar compact />
                    <span>
                      <strong>Thibault “Tibo” Sottiaux</strong>
                      <small>{tibo.handle} · 官方原帖</small>
                    </span>
                    <time dateTime={activeOfficialPreview.publishedAt}>
                      {formatPublishedTime(activeOfficialPreview.publishedAt)}
                    </time>
                  </header>
                  <blockquote>
                    “
                    {activeOfficialPreview.preview?.translation ??
                      activeOfficialPreview.summary}
                    ”
                  </blockquote>
                  {activeOfficialPreview.preview?.originalExcerpt ? (
                    <p className="official-preview-original">
                      {activeOfficialPreview.preview.originalExcerpt}
                    </p>
                  ) : null}
                  <footer className="official-preview-actions">
                    <a
                      href={activeOfficialPreview.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      查看 X 原帖 <ExternalLink aria-hidden="true" />
                    </a>
                    <button type="button" onClick={copyOfficialPreview}>
                      {previewCopied ? <Check /> : <Copy />}
                      {previewCopied ? '已复制' : '复制预告'}
                    </button>
                  </footer>
                </section>
              </div>
            </article>
          ) : null}
          <div className="signal-monitor">
            <div className="signal-monitor-copy">
              <span className="monitor-kicker">
                <Radio aria-hidden="true" /> 雷达在线
              </span>
              <h2>距离下一次信号扫描</h2>
              <div
                className="scan-countdown"
                role="timer"
                aria-label={`距离下一次信号扫描还有 ${countdown.hours} 小时 ${countdown.minutes} 分钟 ${countdown.seconds} 秒`}
              >
                <span>
                  <strong>{countdown.hours}</strong>
                  <small>时</small>
                </span>
                <i aria-hidden="true">:</i>
                <span>
                  <strong>{countdown.minutes}</strong>
                  <small>分</small>
                </span>
                <i aria-hidden="true">:</i>
                <span>
                  <strong>{countdown.seconds}</strong>
                  <small>秒</small>
                </span>
              </div>
              <p className="scan-schedule">
                <span>
                  {countdown.targetDate} {countdown.targetTime}
                </span>
                {monitor.scheduleLabel} · 北京时间
              </p>
            </div>

            <div className="radar-orbit" aria-hidden="true">
              <div className="orbit-ring orbit-ring-1" />
              <div className="orbit-ring orbit-ring-2" />
              <div className="orbit-axis orbit-axis-x" />
              <div className="orbit-axis orbit-axis-y" />
              <div className="orbit-sweep" />
              <span className="orbit-blip orbit-blip-a" />
              <span className="orbit-blip orbit-blip-b" />
              <div className="orbit-center">
                <Radio />
                <span>扫描中</span>
              </div>
            </div>
          </div>

          <aside
            className={`hero-probability${
              probabilityModel.isCooldown ? ' is-cooldown' : ''
            }`}
            aria-labelledby="hero-probability-title"
          >
            <div className="hero-probability-head">
              <div>
                <span className="probability-kicker">
                  <ScanLine aria-hidden="true" /> 历史模型预判
                </span>
                <h3 id="hero-probability-title">
                  {probabilityModel.isCooldown
                    ? '本轮已确认，进入冷却观察'
                    : '未来 24 小时重置可能性'}
                </h3>
              </div>
              <span className="hero-probability-live">
                <span aria-hidden="true" /> 已更新
              </span>
            </div>

            <div className="hero-probability-body">
              <div
                className={`hero-probability-dial${
                  probabilityModel.isCooldown ? ' is-cooldown' : ''
                }`}
                style={
                  {
                    '--probability': `${probabilityModel.probability * 3.6}deg`,
                  } as CSSProperties
                }
                aria-label={
                  probabilityModel.isCooldown
                    ? '本轮重置已确认，当前为冷却观察期'
                    : `未来 24 小时重置可能性 ${probabilityModel.probability}%`
                }
              >
                {probabilityModel.isCooldown ? (
                  <div className="probability-confirmed-mark">
                    <Check aria-hidden="true" />
                    <span>已确认</span>
                  </div>
                ) : (
                  <div>
                    <strong>{probabilityModel.probability}</strong>
                    <span>%</span>
                  </div>
                )}
              </div>

              <div className="hero-probability-copy">
                <strong>
                  {probabilityModel.isCooldown
                    ? '刚完成重置，本轮不再预测“还会不会重置”。'
                    : probabilityModel.probability < 35
                      ? '概率偏低，继续观察明确公告。'
                      : '正在升高，建议留意新的明确表述。'}
                </strong>
                <p>
                  {probabilityModel.isCooldown
                    ? '下一轮预测会在进入新的自然日后恢复。'
                    : '基于已核验的公开重置记录，不把普通动态当作重置信号。'}
                </p>
              </div>
            </div>

            <div className="hero-probability-factors">
              <div>
                <span>距上次确认</span>
                <strong>
                  {probabilityModel.elapsedDays === 0
                    ? '今天'
                    : `${probabilityModel.elapsedDays} 天`}
                </strong>
              </div>
              <div>
                <span>近 24 小时信号</span>
                <strong>{recentSignalCount} 条</strong>
              </div>
              <div>
                <span>历史样本</span>
                <strong>{probabilityModel.sampleSize} 组</strong>
              </div>
            </div>

            <details className="hero-probability-method">
              <summary>
                <Info aria-hidden="true" />
                {probabilityModel.isCooldown
                  ? '为什么现在不显示概率？'
                  : '这个概率怎么算？'}
              </summary>
              <p>
                {probabilityModel.isCooldown
                  ? '网站已经核验到本轮重置。此时继续显示升高概率会造成误导，所以改为冷却观察。'
                  : `在已经等待至少 ${probabilityModel.elapsedDays} 天的历史样本中，统计接下来 24 小时发生重置的比例。这是趋势参考，不是 OpenAI 承诺。`}
              </p>
            </details>
          </aside>
        </section>

        <section
          className="prayer-card reveal reveal-4"
          aria-labelledby="prayer-title"
        >
          <div className="prayer-copy">
            <p className="section-kicker">RESET WISH / GOOD LUCK</p>
            <h2 id="prayer-title">一起等 Tibo 下次重置</h2>
            <p>点一下，为下一次额度重置攒点好运。次数只保存在你的浏览器里。</p>
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

        <section className="stats-grid reveal reveal-4" aria-label="重置统计">
          <article className="stat-card stat-card-primary">
            <span>累计重置公告</span>
            <strong>{resetStats.total}</strong>
            <small>次公开记录</small>
          </article>
          <article className="stat-card">
            <span>平均间隔</span>
            <strong>{resetStats.averageDays}</strong>
            <small>天 / 次</small>
          </article>
          <article className="stat-card">
            <span>最长间隔</span>
            <strong>{resetStats.longestDays}</strong>
            <small>天</small>
          </article>
        </section>

        <section
          className="history-section section-block reveal reveal-5"
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
                  <i className={`legend-dot kind-${kind}`} />
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
                onClick={() => chooseFilter(item.value)}
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
                          event && filter !== 'all' && event.kind !== filter;
                        const isSelected = selectedEvent.date === date;
                        const label = event
                          ? `${formatChineseDate(date)}，${kindMeta[event.kind].label}`
                          : `${formatChineseDate(date)}，无公告`;
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
                              event ? `kind-${event.kind}` : '',
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
              <span className={`selected-icon kind-${selectedEvent.kind}`}>
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
          aria-labelledby="posts-title"
        >
          <div className="section-heading posts-heading">
            <div>
              <p className="section-kicker">TIBO / ALL RECENT POSTS</p>
              <h2 id="posts-title">Tibo 最近动态</h2>
            </div>
            <p>
              已核验 {tiboPosts.length} 条 ·{' '}
              {formatPublishedTime(tiboPostsVerifiedAt)} 核验
            </p>
          </div>

          <div className="posts-layout">
            <div className="tibo-feed-panel">
              <div className="profile-note">
                <a href={tibo.profileUrl} target="_blank" rel="noreferrer">
                  <TiboAvatar compact />
                </a>
                <div>
                  <strong>{tibo.name}</strong>
                  <span>{tibo.role} · 最近公开帖子</span>
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
                          { '--item-delay': `${index * 45}ms` } as CSSProperties
                        }
                      >
                        <div className="tibo-post-meta">
                          <span className="post-category">{post.category}</span>
                          <span className={`post-signal ${signal.className}`}>
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
                  : `查看全部 ${tiboPosts.length} 条动态`}
                <ArrowUpRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <div className="footer-primary">
            <p>
              公开记录均可直达原帖 · 最近数据{' '}
              {formatChineseDate(toShanghaiDateKey(tiboPostsVerifiedAt))} · 与
              OpenAI 无隶属关系
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
            历史规律不代表下一次一定发生，个人额度请以 Codex 内显示为准。
          </p>
        </footer>
      </div>
    </main>
  );
}
