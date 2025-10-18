/**
 * 에러 로깅 유틸리티
 * 나중에 Sentry와 통합될 예정입니다.
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export function logError(
  error: unknown,
  context?: ErrorContext
): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    context,
    environment: process.env.NODE_ENV,
  };

  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Logger]', errorInfo);
  }

  // 프로덕션에서는 Sentry로 전송 (추후 구현)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Sentry.captureException(error, { contexts: { custom: context } })
  }
}

export function logWarning(
  message: string,
  context?: ErrorContext
): void {
  const warningInfo = {
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  console.warn('[Warning Logger]', warningInfo);
}

export function logInfo(
  message: string,
  context?: ErrorContext
): void {
  const infoInfo = {
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  if (process.env.NODE_ENV === 'development') {
    console.info('[Info Logger]', infoInfo);
  }
}
