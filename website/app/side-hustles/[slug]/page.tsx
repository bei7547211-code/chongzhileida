import type { Metadata } from 'next';
import { EditorialHeader, EditorialFooter } from '@/components/editorial-dashboard';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowUpRight,
  Bookmark,
  Eye,
  Gift,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { getSideHustle, sideHustles } from '@/data/side-hustles';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string | string[] }>;
};

const directoryFilters = new Set([
  'all',
  'ai',
  'xiaohongshu',
  'youtube',
  'x',
  'seo',
  'overseas',
]);

export function generateStaticParams() {
  return sideHustles.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const post = getSideHustle((await params).slug);
  if (!post) return {};
  return {
    title: `${post.title} · 精选副业`,
    description: post.hook,
    openGraph: {
      title: post.title,
      description: post.hook,
      images: [post.cover],
    },
  };
}

export default async function SideHustleDetailPage({
  params,
  searchParams,
}: PageProps) {
  const post = getSideHustle((await params).slug);
  if (!post) notFound();
  const rawCategory = (await searchParams).category;
  const requestedCategory = Array.isArray(rawCategory)
    ? rawCategory[0]
    : rawCategory;
  const category =
    requestedCategory && directoryFilters.has(requestedCategory)
      ? requestedCategory
      : 'all';
  const backHref =
    category === 'all'
      ? '/side-hustles'
      : `/side-hustles?category=${encodeURIComponent(category)}`;

  return (
    <main className="radar-page hustle-page">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <article className="page-shell hustle-detail">
        <EditorialHeader active="side-hustles" />
        <Link href={backHref} className="ed-breadcrumb">← 返回案例列表</Link>

        <header className="hustle-detail-head reveal reveal-2">
          <div className="hustle-tags">
            {post.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <h1>{post.title}</h1>
          <section className="hustle-evidence-card" aria-label="案例来源信息">
            <div className="hustle-evidence-author">
              <Image
                src={post.avatar}
                alt={`${post.author} 的头像`}
                width={58}
                height={58}
                priority
              />
              <div>
                <strong>{post.author}</strong>
                <span>
                  发布于 {post.published_at} · 原帖{' '}
                  {post.word_count.toLocaleString('zh-CN')} 字
                </span>
              </div>
            </div>

            <dl className="hustle-evidence-stats">
              <div>
                <dt>
                  <Eye /> 阅读
                </dt>
                <dd>{post.stats.reads.toLocaleString('zh-CN')}</dd>
              </div>
              <div>
                <dt>
                  <Heart /> 点赞
                </dt>
                <dd>{post.stats.likes.toLocaleString('zh-CN')}</dd>
              </div>
              <div>
                <dt>
                  <Bookmark /> 收藏
                </dt>
                <dd>{post.stats.favorites.toLocaleString('zh-CN')}</dd>
              </div>
              <div>
                <dt>
                  <MessageCircle /> 评论
                </dt>
                <dd>{post.stats.comments.toLocaleString('zh-CN')}</dd>
              </div>
            </dl>

            <figure
              className={`hustle-evidence-cover${
                post.slug === 'ai-tiktok-video-1596-orders' ? ' is-banner' : ''
              }`}
            >
              <Image
                src={post.cover}
                alt={`${post.title}原帖封面`}
                fill
                priority
                sizes="(max-width: 760px) calc(100vw - 48px), 760px"
              />
              <figcaption>原帖封面 · 已核验作者与公开数据</figcaption>
            </figure>
          </section>
        </header>

        <section
          className="achievement-board reveal reveal-3"
          aria-labelledby="achievement-title"
        >
          <p className="section-kicker" id="achievement-title">
            RESULTS / 真实成绩
          </p>
          <div>
            {post.hook_stats.map((stat) => (
              <article key={stat.label}>
                <strong>{stat.num}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="hustle-prose-block" aria-labelledby="summary-title">
          <p className="section-kicker">WHAT IT IS ABOUT</p>
          <h2 id="summary-title">这篇讲了什么</h2>
          <p>{post.hook}</p>
        </section>

        <section
          className="hustle-prose-block"
          aria-labelledby="problems-title"
        >
          <p className="section-kicker">QUESTIONS ANSWERED</p>
          <h2 id="problems-title">这篇帖子解决了什么问题</h2>
          <ol className="problem-list">
            {post.problems.map((problem, index) => (
              <li key={problem}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{problem}</p>
              </li>
            ))}
          </ol>
          <p className="answer-note">答案在原帖里。</p>
        </section>

        <section className="hustle-prose-block" aria-labelledby="quotes-title">
          <p className="section-kicker">IN THE AUTHOR&apos;S WORDS</p>
          <h2 id="quotes-title">原作者原话</h2>
          <div className="quote-stack">
            {post.quotes.map((quote) => (
              <blockquote key={quote}>“{quote}”</blockquote>
            ))}
          </div>
        </section>

        <section className="hustle-paywall">
          <p>
            这里刻意不复述方法、步骤和工具。完整答案属于原作者，也留在生财有术。
          </p>
          <div>
            <Link href="/experience-card" className="hustle-primary-cta">
              <Gift /> 免费体验三天 <ArrowUpRight />
            </Link>
          </div>
        </section>
        <EditorialFooter />
      </article>
    </main>
  );
}
