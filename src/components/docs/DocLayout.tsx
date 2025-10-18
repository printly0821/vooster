'use client';

import { type ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import SearchDialog from './SearchDialog';
import { Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocLayoutProps {
  children: ReactNode;
}

export default function DocLayout({ children }: DocLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / Cmd+K로 검색 열기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 lg:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <span className="font-semibold">프로젝트 문서</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop Search Button */}
      <div className="fixed right-8 top-8 z-40 hidden lg:block">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Search className="h-4 w-4" />
          <span>검색</span>
          <kbd className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-800">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Search Dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      <div className="flex">
        {/* Sidebar - 왼쪽 고정 */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 lg:pl-[280px]">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
