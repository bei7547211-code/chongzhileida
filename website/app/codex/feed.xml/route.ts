import { publicRss } from '@/lib/public-rss';
export const dynamic = 'force-static';
export function GET(){return publicRss('codex');}
