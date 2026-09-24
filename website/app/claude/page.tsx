import type { Metadata } from 'next';
import { EditorialDashboard } from '@/components/editorial-dashboard';

export const metadata: Metadata = {
  title: 'Claude 额度状态 · AI 重置雷达',
  description: '查看 Claude 官方公开重置公告、原帖依据、历史记录和订阅提醒。',
};

export default function ClaudePage() {
  return <EditorialDashboard view="claude" />;
}
