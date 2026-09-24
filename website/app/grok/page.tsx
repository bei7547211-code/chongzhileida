import type { Metadata } from 'next';
import { EditorialDashboard } from '@/components/editorial-dashboard';

export const metadata: Metadata = {
  title: 'Grok 额度状态 · AI 重置雷达',
  description: '查看 Grok 官方公开重置公告，区分 Bot、Chat 和 Build 的适用范围。',
};

export default function GrokPage() {
  return <EditorialDashboard view="grok" />;
}
