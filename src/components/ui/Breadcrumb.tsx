'use client';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-uni-text-400 mb-4">
      <Link href="/" className="hover:text-uni-text-600 transition-colors">Início</Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-uni-text-600 transition-colors">{item.label}</Link>
          ) : (
            <span className="text-uni-text-700 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
