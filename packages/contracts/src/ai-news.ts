export interface NewsItem { id: string; title: string; summary: string; url: string; publishedAt: string; source: string; category: string }
export interface NewsSource { id: string; checkedAt: string | null; attemptedAt: string; failed: boolean }
export interface NewsResponse { items: NewsItem[]; sources: NewsSource[] }
