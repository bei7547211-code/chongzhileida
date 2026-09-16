/* oxlint-disable next/no-html-link-for-pages -- plain anchors avoid a hydration conflict in the local preview runtime */
import type { Metadata } from 'next';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Gift,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { sideHustles, sideHustlesUpdatedAt } from '@/data/side-hustles';

export const metadata: Metadata = {
  title: '精选副业 · 真实成绩与完整案例',
  description:
    '从生财有术精华帖中筛选个人实战案例，只展示真实成绩和问题，完整方法留在原帖。',
};

export default function SideHustlesPage() {
  return (
    <main className="radar-page hustle-page">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <div className="page-shell hustle-shell">
        <header className="hustle-nav reveal reveal-1">
          <a href="/" className="hustle-back">
            <ArrowLeft /> 重置雷达
          </a>
          <div className="hustle-nav-actions">
            <span className="hustle-nav-meta">
              更新于 {sideHustlesUpdatedAt}
            </span>
            <a
              href="/experience-card"
              className="hustle-nav-cta"
              aria-label="免费体验生财有术三天"
            >
              <Gift />
              <span className="hustle-cta-label-long">直接体验</span>
              <span className="hustle-cta-label-short">体验</span>
              <ArrowUpRight />
            </a>
          </div>
        </header>

        <section className="hustle-hero reveal reveal-2">
          <p className="section-kicker">SELECTED SIDE HUSTLES</p>
          <h1>精选副业</h1>
          <p>
            只选有真实成绩的个人实战。这里告诉你谁做成了、解决了什么问题，完整方法留在生财有术。
          </p>
          <div className="hustle-principles" aria-label="收录原则">
            <span>{sideHustles.length} 个真实案例</span>
            <span>个人复盘</span>
            <span>免费体验</span>
          </div>
        </section>

        <section className="hustle-feed" aria-label="精选副业列表">
          {sideHustles.map((post, index) => (
            <article
              className="hustle-feed-card reveal reveal-3"
              key={post.topic_id}
            >
              <a href={`/side-hustles/${post.slug}`} className="hustle-cover">
                <Image
                  src={post.cover}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 420px"
                  priority={index === 0}
                />
              </a>
              <div className="hustle-card-copy">
                <div className="hustle-author">
                  <Image src={post.avatar} alt="" width={42} height={42} />
                  <span>
                    <strong>{post.author}</strong>
                    <small>{post.published_at} · 生财精华帖</small>
                  </span>
                </div>
                <div className="hustle-tags">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <h2>
                  <a href={`/side-hustles/${post.slug}`}>{post.title}</a>
                </h2>
                <p>{post.hook}</p>
                <div className="hustle-card-stats" aria-label="帖子互动数据">
                  <span>
                    <Heart /> {post.stats.likes}
                  </span>
                  <span>
                    <Bookmark /> {post.stats.favorites}
                  </span>
                  <span>
                    <MessageCircle /> {post.stats.comments}
                  </span>
                </div>
                <a
                  href={`/side-hustles/${post.slug}`}
                  className="hustle-read-more"
                >
                  看这篇解决什么问题 <ArrowUpRight />
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
