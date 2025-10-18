'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TocItem } from '@/lib/docs/markdown';

interface TableOfContentsProps {
  toc: readonly TocItem[] | TocItem[];
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -80% 0px',
      },
    );

    // toc의 id를 기반으로 헤딩 관찰
    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    headings.forEach((heading) => observer.observe(heading));

    return () => {
      headings.forEach((heading) => observer.unobserve(heading));
      observer.disconnect();
    };
  }, [toc]);

  if (toc.length === 0) {
    return null;
  }

  return (
    <nav className="hidden xl:block sticky top-8 w-[240px] max-h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="text-sm">
        <h4 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
          목차
        </h4>
        <ul className="space-y-2">
          {toc.map((item) => {
            const isActive = activeId === item.id;

            return (
              <li
                key={item.id}
                className={cn(item.level === 3 && 'ml-4')}
              >
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className={cn(
                    'block py-1 transition-colors',
                    isActive
                      ? 'font-medium text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
                  )}
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
