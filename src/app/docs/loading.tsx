import { Loader2 } from 'lucide-react';

export default function DocsLoading() {
  return (
    <div className="flex w-full flex-col gap-8">
      {/* 메인 컨텐츠 스켈레톤 */}
      <div className="flex-1 max-w-3xl space-y-6">
        {/* 제목 스켈레톤 */}
        <div className="space-y-3">
          <div className="h-10 w-3/4 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-5 w-1/2 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* 메타데이터 스켈레톤 */}
        <div className="flex gap-4">
          <div className="h-4 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* 구분선 */}
        <div className="my-4 h-px bg-gray-200 dark:bg-gray-800" />

        {/* 본문 스켈레톤 */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
              style={{ width: `${90 - i * 10}%` }}
            />
          ))}
        </div>

        {/* 섹션 제목 스켈레톤 */}
        <div className="mt-8 space-y-4">
          <div className="h-7 w-1/3 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
              style={{ width: `${85 - i * 5}%` }}
            />
          ))}
        </div>
      </div>

      {/* 목차 스켈레톤 (오른쪽) */}
      <div className="hidden w-[240px] flex-col gap-3 xl:flex">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-4 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
            style={{ width: `${100 - i * 15}%`, marginLeft: `${i * 12}px` }}
          />
        ))}
      </div>

      {/* 로딩 표시기 */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md dark:border-gray-800 dark:bg-gray-900">
        <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">로딩 중...</span>
      </div>
    </div>
  );
}
