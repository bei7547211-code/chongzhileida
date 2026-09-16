import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, ExternalLink, Gift } from 'lucide-react';
import { getSideHustle, sideHustles } from '@/data/side-hustles';

type PageProps = { params: Promise<{ slug: string }> };

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

export default async function SideHustleDetailPage({ params }: PageProps) {
  const post = getSideHustle((await params).slug);
  if (!post) notFound();

  return (
    <main className="radar-page hustle-page">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <article className="page-shell hustle-detail">
        <nav className="hustle-nav reveal reveal-1">
          <Link href="/side-hustles" className="hustle-back">
            <ArrowLeft /> 精选副业
          </Link>
          <span>原帖 {post.word_count.toLocaleString('zh-CN')} 字</span>
        </nav>

        <header className="hustle-detail-head reveal reveal-2">
          <div className="hustle-tags">
            {post.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <h1>{post.title}</h1>
          <p className="hustle-byline">
            作者 {post.author} · 发布于 {post.published_at} · 阅读{' '}
            {post.stats.reads.toLocaleString('zh-CN')}
          </p>
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
            这里刻意不复述方法、步骤和工具。完整答案属于原作者，也留在原帖里。
          </p>
          <div>
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="hustle-primary-cta"
            >
              去生财阅读全文 <ExternalLink />
            </a>
            <Link href="/experience-card" className="hustle-secondary-cta">
              <Gift /> 免费体验三天 <ArrowUpRight />
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
