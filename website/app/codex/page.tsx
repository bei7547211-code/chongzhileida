import type { Metadata } from 'next';
import { EditorialDashboard } from '@/components/editorial-dashboard';

export const metadata: Metadata = {
  title: 'Codex 重置雷达 · AI 重置雷达',
  description: '查看 Codex 重置状态、历史记录与可追溯的 Tibo 原帖证据。',
};

export default function CodexPage() {
  return <EditorialDashboard view="codex" />;
}
