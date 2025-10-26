/**
 * 에러 처리 기능 exports (T-008)
 */

// Types
export type {
  ErrorCategory,
  ErrorSeverity,
  AppError,
  ErrorRecoveryAction,
  ErrorGuidance,
  ReconnectionConfig,
  ClientErrorLog,
} from './types';

// Error Handler
export {
  createError,
  getErrorGuidance,
  getLogLevel,
  logError,
  isRetryable,
  calculateBackoffDelay,
} from './lib/error-handler';

// Error Logger
export {
  logErrorToServer,
  getStoredErrorLogs,
  clearErrorLogs,
  exportErrorLogs,
} from './lib/error-logger';

// Socket Reconnection
export {
  setupSocketReconnection,
  manualReconnect,
  getReconnectionStatus,
} from './lib/socket-reconnection';

// Hooks
export { useErrorHandler, executeWithRetry } from './hooks/useErrorHandler';
