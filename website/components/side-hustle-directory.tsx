'use client';

/* oxlint-disable next/no-html-link-for-pages -- plain anchors avoid a hydration conflict in the local preview runtime */

import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpenText,
  Gift,
  ShieldCheck,
} from 'lucide-react';
import type { SideHustle } from '@/data/side-hustles';

type Filter = {
  id: string;
  label: string;
  tags?: string[];
};

const filters: Filter[] = [
  { id: 'all', label: '全部' },
  { id: 'ai', label: 'AI', tags: ['AI', 'AI自媒体', 'AI视频', '虚拟IP'] },
  { id: 'xiaohongshu', label: '小红书', tags: ['小红书'] },
  { id: 'youtube', label: 'YouTube', tags: ['YouTube'] },
  { id: 'x', label: 'X', tags: ['X'] },
  { id: 'seo', label: 'Google SEO', tags: ['Google SEO'] },
  { id: 'overseas', label: '出海', tags: ['出海'] },
];

function postMatchesFilter(post: SideHustle, filter: Filter) {
  if (!filter.tags) return true;
  return filter.tags.some((tag) => post.tags.includes(tag));
}

function shorten(text: string, maxLength = 82) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export function SideHustleDirectory({ posts }: { posts: SideHustle[] }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const visiblePosts = useMemo(() => {
    const selected = filters.find((filter) => filter.id === activeFilter);
    return selected
      ? posts.filter((post) => postMatchesFilter(post, selected))
      : posts;
  }, [activeFilter, posts]);

  return (
    <section
      className="hustle-directory-layout reveal reveal-3"
      aria-label="精选副业案例"
    >
      <div className="hustle-directory-panel" id="case-directory">
        <div className="hustle-directory-head">
          <div>
            <p className="hustle-directory-eyebrow">CURATED CASES</p>
            <h2>真实成绩，按方向快速找</h2>
          </div>
          <span className="hustle-result-count" aria-live="polite">
            {visiblePosts.length} 个案例
          </span>
        </div>

        <div className="hustle-filter-bar" aria-label="按项目方向筛选">
          {filters.map((filter) => {
            const count = posts.filter((post) =>
              postMatchesFilter(post, filter),
            ).length;
            if (count === 0) return null;

            return (
              <button
                type="button"
                key={filter.id}
                className={activeFilter === filter.id ? 'is-active' : ''}
                aria-pressed={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="hustle-rank-list">
          {visiblePosts.map((post) => {
            const originalRank = posts.findIndex(
              (candidate) => candidate.topic_id === post.topic_id,
            );
            const primaryStat = post.hook_stats[0];

            return (
              <article className="hustle-rank-row" key={post.topic_id}>
                <span
                  className="hustle-rank-number"
                  aria-label={`第 ${originalRank + 1} 个案例`}
                >
                  {String(originalRank + 1).padStart(2, '0')}
                </span>

                <Image
                  className="hustle-rank-avatar"
                  src={post.avatar}
                  alt={`${post.author} 的头像`}
                  width={46}
                  height={46}
                />

                <div className="hustle-rank-copy">
                  <h3>
                    <a href={`/side-hustles/${post.slug}`}>{post.title}</a>
                  </h3>
                  <p>
                    <strong>{post.author}</strong>
                    <span>·</span>
                    <span>{post.tags.slice(0, 2).join(' / ')}</span>
                    <span>·</span>
                    <span>{shorten(post.hook)}</span>
                  </p>
                </div>

                <div className="hustle-rank-result">
                  <strong>{primaryStat.num}</strong>
                  <span>{primaryStat.label}</span>
                </div>

                <a
                  className="hustle-rank-cta"
                  href={`/side-hustles/${post.slug}`}
                  aria-label={`查看${post.title}的案例解读`}
                >
                  查看解读 <ArrowUpRight />
                </a>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="hustle-sidebar" aria-label="精选副业说明与体验入口">
        <section className="hustle-sidebar-card hustle-curator-card">
          <span className="hustle-sidebar-icon" aria-hidden="true">
            <BadgeCheck />
          </span>
          <p className="hustle-sidebar-kicker">为什么只有这几篇？</p>
          <h2>只收真实结果的个人复盘</h2>
          <p>
            不凑数，不写虚构收益。每篇都会核对作者、数据、原帖和能解决的具体问题。
          </p>
          <a href="#case-directory" className="hustle-sidebar-link">
            <BookOpenText /> 查看全部 {posts.length} 个案例
          </a>
        </section>

        <a className="hustle-experience-card" href="/experience-card">
          <div className="hustle-experience-heading">
            <span>
              <Gift /> 免费体验 3 天
            </span>
            <strong>扫码添加，立即领取</strong>
          </div>
          <div className="hustle-experience-poster">
            <Image
              src="/side-hustles/experience-card.png"
              alt="生财有术三天体验卡"
              fill
              sizes="(max-width: 980px) 320px, 280px"
            />
          </div>
          <span className="hustle-experience-action">
            查看大图 <ArrowUpRight />
          </span>
        </a>

        <section className="hustle-sidebar-card hustle-trust-card">
          <h2>收录承诺</h2>
          <dl>
            <div>
              <dt>真实案例</dt>
              <dd>{posts.length} 篇</dd>
            </div>
            <div>
              <dt>原帖可核验</dt>
              <dd>{posts.length} 篇</dd>
            </div>
            <div>
              <dt>虚构收益</dt>
              <dd>0 篇</dd>
            </div>
          </dl>
          <p>
            <ShieldCheck /> 先看结果，再看问题，最后决定是否深入。
          </p>
        </section>
      </aside>
    </section>
  );
}
