/**
 * 에러 처리 Hook (T-008)
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AppError } from '../types';
import {
  createError,
  getErrorGuidance,
  logError,
  isRetryable,
  calculateBackoffDelay,
} from '../lib/error-handler';
import { logErrorToServer } from '../lib/error-logger';

export interface UseErrorHandlerReturn {
  handleError: (error: AppError | Error, details?: unknown) => void;
  handleNetworkError: (message?: string) => void;
  handleOrderNotFound: (orderNo: string) => void;
  handleMonitorNotPaired: () => void;
  handlePermissionDenied: (code: string) => void;
  handleSocketError: (message?: string) => void;
  handleCameraError: (message?: string) => void;
}

/**
 * 에러 처리 Hook
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const { toast } = useToast();

  const handleError = useCallback(
    async (error: AppError | Error, details?: unknown) => {
      // AppError 객체로 정규화
      const appError = (error && 'category' in error && 'severity' in error)
        ? (error as AppError)
        : createError(
            'unknown',
            error instanceof Error ? error.message : String(error),
            { details }
          );

      // 콘솔 로깅
      logError(appError);

      // 서버에 비동기 전송 (사용자 경험 방해 금지)
      logErrorToServer(appError).catch(() => {
        // 무시
      });

      // 사용자 안내
      const guidance = getErrorGuidance(appError);

      toast({
        title: guidance.title,
        description: guidance.message,
        variant: appError.severity === 'critical' ? 'destructive' : 'default',
        duration: guidance.autoClose,
      });
    },
    [toast]
  );

  const handleNetworkError = useCallback(
    (message?: string) => {
      const error = createError('network', message || '네트워크 연결 오류가 발생했습니다.', {
        severity: 'warning',
      });
      handleError(error);
    },
    [handleError]
  );

  const handleOrderNotFound = useCallback(
    (orderNo: string) => {
      const error = createError(
        'order',
        `주문번호 ${orderNo}를 찾을 수 없습니다.`,
        {
          code: 'ORDER_NOT_FOUND',
          context: { orderNo },
        }
      );
      handleError(error);
    },
    [handleError]
  );

  const handleMonitorNotPaired = useCallback(() => {
    const error = createError(
      'monitor',
      '세컨드 모니터가 연결되지 않았습니다.',
      {
        code: 'MONITOR_NOT_PAIRED',
        severity: 'warning',
      }
    );
    handleError(error);
  }, [handleError]);

  const handlePermissionDenied = useCallback(
    (code: string) => {
      let message = '권한이 거부되었습니다.';

      if (code === 'CAMERA_PERMISSION_DENIED') {
        message = '카메라 권한이 필요합니다.';
      } else if (code === 'POPUP_BLOCKED') {
        message = '팝업이 차단되었습니다.';
      }

      const error = createError('permission', message, {
        code,
        severity: 'warning',
      });
      handleError(error);
    },
    [handleError]
  );

  const handleSocketError = useCallback(
    (message?: string) => {
      const error = createError('socket', message || '서버 연결 오류가 발생했습니다.', {
        severity: 'warning',
      });
      handleError(error);
    },
    [handleError]
  );

  const handleCameraError = useCallback(
    (message?: string) => {
      const error = createError('camera', message || '카메라 오류가 발생했습니다.', {
        severity: 'error',
      });
      handleError(error);
    },
    [handleError]
  );

  return {
    handleError,
    handleNetworkError,
    handleOrderNotFound,
    handleMonitorNotPaired,
    handlePermissionDenied,
    handleSocketError,
    handleCameraError,
  };
}

/**
 * 재시도 로직을 포함한 비동기 작업 실행
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (retryCount: number, delay: number) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const initialDelay = options?.initialDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 15000;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt, initialDelay, maxDelay);
        options?.onRetry?.(attempt + 1, delay);

        // 지수 백오프 대기
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Maximum retries exceeded');
}
