import { Loader2 } from 'lucide-react';

export default function BarcodeGuideLoading() {
  return (
    <div className="flex w-full animate-in fade-in duration-300">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-3xl space-y-8">
        {/* 헤더 섹션 */}
        <div className="space-y-4 border-b border-gray-200 pb-6 dark:border-gray-800">
          {/* 제목 */}
          <div className="space-y-2">
            <div className="h-12 w-3/4 animate-pulse rounded-lg bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700" />
          </div>

          {/* 부제목 */}
          <div className="h-6 w-2/3 animate-pulse rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600" />

          {/* 메타데이터 */}
          <div className="flex gap-4 pt-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 pt-4">
            <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>

        {/* 본문 섹션 */}
        <div className="space-y-6">
          {/* 첫 번째 단락 */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`p1-${i}`} className="h-5 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          ))}

          {/* 코드 블록 스켈레톤 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`code-${i}`}
                  className="h-4 w-full animate-pulse rounded bg-gray-300 dark:bg-gray-700"
                  style={{ width: `${80 + Math.random() * 20}%` }}
                />
              ))}
            </div>
          </div>

          {/* 두 번째 단락 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`p2-${i}`}
              className="h-5 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800"
              style={{ width: `${95 - i * 5}%` }}
            />
          ))}

          {/* 섹션 제목 */}
          <div className="mt-8 h-8 w-1/3 animate-pulse rounded-lg bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700" />

          {/* 섹션 내용 */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`section-${i}`}
              className="h-5 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800"
              style={{ width: `${90 - i * 3}%` }}
            />
          ))}
        </div>
      </div>

      {/* 목차 스켈레톤 */}
      <div className="hidden w-[240px] space-y-3 xl:block">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`toc-${i}`}
            className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800"
            style={{
              width: `${100 - (i % 2) * 20}%`,
              marginLeft: `${Math.floor(i / 2) * 12}px`,
            }}
          />
        ))}
      </div>

      {/* 로딩 인디케이터 */}
      <div className="fixed bottom-8 right-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 shadow-lg dark:border-blue-900 dark:bg-blue-950">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">문서 로딩 중...</span>
        </div>
      </div>
    </div>
  );
}
