'use client';

import { useEffect } from 'react';
import { FileWarning, RotateCw } from 'lucide-react';
import { logError } from '@/lib/error-logger';

interface DocsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DocsError({ error, reset }: DocsErrorProps) {
  useEffect(() => {
    // 에러 로깅 (Sentry 통합 준비)
    logError(error, {
      errorBoundary: 'DocsError',
      digest: error.digest,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    });
  }, [error]);

  return (
    <div className="flex w-full items-center justify-center py-12">
      <div className="flex max-w-md flex-col items-center gap-6 rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
          <FileWarning className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            문서를 불러올 수 없습니다
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            요청한 문서를 로드하는 중에 오류가 발생했습니다.
            {process.env.NODE_ENV === 'development' && (
              <code className="mt-2 block break-words rounded bg-red-200 p-2 text-xs text-red-800 dark:bg-red-900 dark:text-red-200">
                {error.message}
              </code>
            )}
          </p>
        </div>

        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
        >
          <RotateCw className="h-4 w-4" />
          다시 시도
        </button>
      </div>
    </div>
  );
}
