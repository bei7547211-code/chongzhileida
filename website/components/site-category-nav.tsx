import Link from 'next/link';

export type SiteCategory =
  | 'home'
  | 'codex'
  | 'claude'
  | 'grok'
  | 'tools'
  | 'knowledge';

const categoryLinks: Array<{
  id: SiteCategory;
  label: string;
  href: string;
}> = [
  { id: 'home', label: '首页', href: '/' },
  { id: 'codex', label: 'Codex', href: '/codex' },
  { id: 'claude', label: 'Claude', href: '/claude' },
  { id: 'grok', label: 'Grok', href: '/grok' },
  { id: 'tools', label: '工具', href: '/tools' },
  { id: 'knowledge', label: '知识库', href: '/knowledge' },
];

export function SiteCategoryNav({ active }: { active?: SiteCategory }) {
  return (
    <nav className="site-category-nav" aria-label="网站分类">
      {categoryLinks.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={active === item.id ? 'is-active' : undefined}
          aria-current={active === item.id ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
