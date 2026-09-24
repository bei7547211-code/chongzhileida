import type { Metadata } from 'next';
import { EditorialDashboard } from '@/components/editorial-dashboard';

export const metadata: Metadata = {
  title: '重置知识库 · AI 重置雷达',
  description: '用大白话解释额度重置、重置次数与个人账户核验方法。',
};

export default function KnowledgePage() {
  return <EditorialDashboard view="knowledge" />;
}
