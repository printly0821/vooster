'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  slug: string;
  title: string;
  category: string;
  score: number;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 검색 실행 (API 호출)
  useEffect(() => {
    const searchAsync = async () => {
      if (query.trim()) {
        setIsLoading(true);
        try {
          const response = await fetch(
            `/api/docs/search?q=${encodeURIComponent(query)}`
          );
          const searchResults = await response.json();
          setResults(searchResults);
          setSelectedIndex(0);
        } catch (error) {
          console.error('Search failed:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    };

    const debounce = setTimeout(searchAsync, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateToDoc(results[selectedIndex].slug);
    }
  };

  const navigateToDoc = (slug: string) => {
    router.push(`/docs/${slug}`);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>문서 검색</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex items-center border-b border-gray-200 px-4 dark:border-gray-800">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="문서 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent px-4 py-4 text-sm outline-none"
            autoFocus
          />
          <kbd className="hidden rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400 sm:block">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <ul>
              {results.map((result, index) => (
                <li key={result.slug}>
                  <button
                    onClick={() => navigateToDoc(result.slug)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                      index === selectedIndex
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900',
                    )}
                  >
                    <FileText className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                        {result.title}
                      </div>
                      <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {result.category}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              문서 제목이나 카테고리를 검색하세요.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                ↑↓
              </kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                Enter
              </kbd>
              선택
            </span>
          </div>
          <span>{results.length}개 결과</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
