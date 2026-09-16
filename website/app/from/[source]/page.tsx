import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResetDashboard } from '@/components/reset-dashboard';

const trafficSources = ['wechat', 'x'] as const;

type TrafficSource = (typeof trafficSources)[number];
type PageProps = { params: Promise<{ source: string }> };

export const dynamicParams = false;

export const metadata: Metadata = {
  title: '重置雷达 · Reset Radar',
  description: '追踪 Tibo 的 Codex 公共重置公告、历史节奏与原始 X 帖子。',
  alternates: { canonical: '/' },
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return trafficSources.map((source) => ({ source }));
}

function isTrafficSource(source: string): source is TrafficSource {
  return trafficSources.includes(source as TrafficSource);
}

export default async function TrafficSourceEntryPage({ params }: PageProps) {
  const { source } = await params;
  if (!isTrafficSource(source)) notFound();

  return <ResetDashboard />;
}
