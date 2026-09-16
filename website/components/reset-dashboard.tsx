'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Radio,
  SearchCheck,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type FilterKind = 'all' | ResetKind;

const filters: { value: FilterKind; label: string }[] = [
  { value: 'all', label: '全部记录' },
  { value: 'full', label: '额度重置' },
  { value: 'banked', label: '重置卡' },
  { value: 'signal', label: '重置信号' },
];

const latestAnnouncement = announcements[0];

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createHeatmapWeeks() {
  const start = new Date('2026-03-16T00:00:00.000Z');
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

function getRelativeTime(publishedAt: string) {
  const elapsed = Math.max(0, Date.now() - Date.parse(publishedAt));
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
  const [showAll, setShowAll] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>(
    'idle',
  );
  const heatmapWeeks = useMemo(() => createHeatmapWeeks(), []);
  const latestRelative = getRelativeTime(latestAnnouncement.publishedAt);
  const eventMap = useMemo(
    () => new Map(resetEvents.map((event) => [event.date, event])),
    [],
  );

  const visibleAnnouncements = announcements
    .filter((item) => filter === 'all' || item.kind === filter)
    .slice(0, showAll ? announcements.length : 3);

  async function shareRadar() {
    const text = `重置雷达：Codex 最近一次公共重置发生在 ${latestAnnouncement.date}。过去记录 ${resetStats.total} 次，平均间隔 ${resetStats.averageDays} 天。（公开数据原型）`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Codex 重置雷达', text });
        setShareState('shared');
      } else {
        await navigator.clipboard.writeText(text);
        setShareState('copied');
      }
      window.setTimeout(() => setShareState('idle'), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareState('idle');
    }
  }

  function chooseFilter(nextFilter: FilterKind) {
    setFilter(nextFilter);
    setShowAll(false);
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
            <span>
              <span className="brand-title">Codex 重置雷达</span>
              <span className="profile-line">
                <strong>Tibo</strong>
                <span>{tibo.handle}</span>
                <ArrowUpRight aria-hidden="true" />
              </span>
            </span>
          </a>

          <div className="header-status">
            <span className="status-dot" aria-hidden="true" />
            {monitor.enabled ? 'DAILY REVIEW ACTIVE' : 'MANUAL REVIEW'}
          </div>
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
            <Button
              type="button"
              size="lg"
              onClick={shareRadar}
              className="pill-action"
            >
              {shareState === 'copied' ? (
                <Copy />
              ) : shareState === 'shared' ? (
                <Check />
              ) : (
                <Share2 />
              )}
              {shareState === 'copied'
                ? '已复制'
                : shareState === 'shared'
                  ? '已打开分享'
                  : '分享当前状态'}
            </Button>
            <a
              href={tibo.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="secondary-action"
            >
              关注 Tibo <ArrowUpRight />
            </a>
          </div>
        </section>

        <section
          className="review-flow reveal reveal-3"
          aria-label="重置雷达运行机制"
        >
          <article>
            <span className="review-flow-icon">
              <Clock3 aria-hidden="true" />
            </span>
            <div>
              <small>STEP 01 · {monitor.scheduleLabel}</small>
              <strong>公开信息巡检</strong>
              <p>定时检查 Tibo 的公开动态，不需要付费 API。</p>
            </div>
          </article>
          <article>
            <span className="review-flow-icon">
              <SearchCheck aria-hidden="true" />
            </span>
            <div>
              <small>STEP 02 · EVIDENCE</small>
              <strong>原帖证据核验</strong>
              <p>核对作者、原文、链接与是否真的宣布重置。</p>
            </div>
          </article>
          <article>
            <span className="review-flow-icon">
              <ShieldCheck aria-hidden="true" />
            </span>
            <div>
              <small>STEP 03 · REVIEWED</small>
              <strong>确认后再发布</strong>
              <p>含糊信号暂停更新，只把已确认的信息放到网站。</p>
            </div>
          </article>
        </section>

        <section
          className="latest-card reveal reveal-4"
          aria-labelledby="latest-title"
        >
          <div className="card-grid-pattern" aria-hidden="true" />
          <div className="latest-copy">
            <p className="eyebrow" id="latest-title">
              距离最近一次重置公告
            </p>
            <div className="latest-time">
              <strong>{latestRelative.value}</strong>
              {latestRelative.unit && <span>{latestRelative.unit}</span>}
            </div>
            <a
              className="latest-source"
              href={latestAnnouncement.xUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                {latestAnnouncement.emoji} {latestAnnouncement.title}
              </span>
              <span>
                {formatPublishedTime(latestAnnouncement.publishedAt)} GMT+8
              </span>
              <ExternalLink />
            </a>
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
              <span>已核验</span>
            </div>
          </div>

          <div className="watching-sticker">
            <span>👀</span>
            <div>
              <strong>正在守候</strong>
              <small>下一次公共信号</small>
            </div>
          </div>
        </section>

        <section className="stats-grid reveal reveal-5" aria-label="重置统计">
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
          className="history-section section-block reveal reveal-6"
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
                  <span>3月</span>
                  <span>4月</span>
                  <span>5月</span>
                  <span>6月</span>
                  <span>7月</span>
                  <span>8月</span>
                  <span>9月</span>
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
          className="announcements-section section-block"
          aria-labelledby="announcements-title"
        >
          <div className="section-heading announcement-heading">
            <div>
              <p className="section-kicker">TIBO / VERIFIED POSTS</p>
              <h2 id="announcements-title">Codex 重置公告</h2>
            </div>
            <p>每条卡片都直达原始 X 帖子</p>
          </div>

          <div className="profile-note">
            <a href={tibo.profileUrl} target="_blank" rel="noreferrer">
              <TiboAvatar compact />
            </a>
            <div>
              <strong>{tibo.name}</strong>
              <span>{tibo.role} · 页面重点追踪对象</span>
            </div>
            <Sparkles aria-hidden="true" />
          </div>

          <div className="announcement-list">
            {visibleAnnouncements.map((announcement, index) => (
              <article className="announcement-row" key={announcement.id}>
                <a
                  className="timeline-avatar"
                  href={tibo.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="查看 Tibo 的 X 主页"
                >
                  <TiboAvatar compact />
                </a>
                <span className="timeline-line" aria-hidden="true" />
                <a
                  className="announcement-card"
                  href={announcement.xUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ '--item-delay': `${index * 70}ms` } as CSSProperties}
                >
                  <div className="announcement-meta">
                    <span className={`kind-badge kind-${announcement.kind}`}>
                      {announcement.emoji} {kindMeta[announcement.kind].label}
                    </span>
                    <time dateTime={announcement.date}>
                      {formatRelativeTime(announcement.publishedAt)} ·{' '}
                      {formatPublishedTime(announcement.publishedAt)} GMT+8
                    </time>
                    <ExternalLink className="announcement-external" />
                  </div>
                  <h3>{announcement.title}</h3>
                  <p className="announcement-summary">{announcement.summary}</p>
                  <blockquote>{announcement.original}</blockquote>
                  <span className="view-original">
                    在 X 查看原帖 <ArrowUpRight />
                  </span>
                </a>
              </article>
            ))}
          </div>

          {announcements.filter(
            (item) => filter === 'all' || item.kind === filter,
          ).length > 3 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="show-more"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? '收起公告' : '展开更多公告'}
              <ChevronDown className={showAll ? 'rotate-180' : ''} />
            </Button>
          )}
        </section>

        <footer className="site-footer">
          <p>
            {monitor.scheduleLabel} 公开信息巡检 · 证据核验后发布 · 最近数据{' '}
            {formatChineseDate(resetStats.updatedAt.slice(0, 10))} · 与 OpenAI
            无隶属关系
          </p>
          <p>历史规律不代表下一次一定发生，个人额度请以 Codex 内显示为准。</p>
        </footer>
      </div>
    </main>
  );
}
