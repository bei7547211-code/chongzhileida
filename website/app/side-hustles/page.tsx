/* oxlint-disable next/no-html-link-for-pages -- plain anchors avoid a hydration conflict in the local preview runtime */
import type { Metadata } from 'next';
import { EditorialHeader, EditorialFooter } from '@/components/editorial-dashboard';
import { ShieldCheck } from 'lucide-react';
import { SideHustleDirectory } from '@/components/side-hustle-directory';
import { sideHustles } from '@/data/side-hustles';

export const metadata: Metadata = {
  title: '精选副业 · 真实成绩与完整案例',
  description:
    '从生财有术精华帖中筛选个人实战案例，只展示真实成绩和问题，完整方法留在原帖。',
};

type PageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function SideHustlesPage({ searchParams }: PageProps) {
  const rawCategory = (await searchParams).category;
  const initialFilter = Array.isArray(rawCategory)
    ? rawCategory[0]
    : rawCategory;

  return (
    <main className="radar-page hustle-page hustle-index-page">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <div className="page-shell hustle-shell">
        <EditorialHeader active="side-hustles" />

        <section className="hustle-hero-banner reveal reveal-2">
          <div className="hustle-hero-copy">
            <p className="hustle-hero-kicker">SELECTED SIDE HUSTLES</p>
            <div className="hustle-hero-title-row">
              <h1>精选副业</h1>
              <span>除了上班，还能做什么赚钱？</span>
            </div>
            <p>
              从生财有术精华帖中筛选真实项目复盘。先看谁做成了、做到什么程度，再决定要不要深入学习。
            </p>
          </div>

          <div className="hustle-hero-proof" aria-label="生财有术社群信息">
            <span>
              <ShieldCheck /> 精华内容 · 逐篇核验
            </span>
            <div>
              <p>
                <strong>8万+</strong>
                <small>社群成员</small>
              </p>
              <p>
                <strong>10年</strong>
                <small>持续运营</small>
              </p>
            </div>
          </div>
        </section>

        <SideHustleDirectory
          posts={sideHustles}
          initialFilter={initialFilter}
        />
        <EditorialFooter />
      </div>
    </main>
  );
}
