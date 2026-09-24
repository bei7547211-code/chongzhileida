import type { Metadata } from 'next';
import { EditorialDashboard } from '@/components/editorial-dashboard';

export const metadata: Metadata = {
  title: '实用工具 · AI 重置雷达',
  description: '检查真实额度、订阅重置提醒并生成可验证的分享卡。',
};

export default function ToolsPage() {
  return <EditorialDashboard view="tools" />;
}
