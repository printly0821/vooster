/**
 * 에러 처리 타입 정의 (T-008)
 */

/**
 * 에러 카테고리
 */
export type ErrorCategory =
  | 'network' // 네트워크 오류
  | 'order' // 주문 조회 오류
  | 'monitor' // 모니터 연동 오류
  | 'permission' // 권한 거부
  | 'socket' // Socket.IO 오류
  | 'camera' // 카메라 오류
  | 'unknown'; // 미분류

/**
 * 에러 심각도
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * 에러 정보
 */
export interface AppError {
  id: string; // 고유 에러 ID (로깅용)
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string; // 사용자 친화적 메시지
  code?: string; // 에러 코드 (e.g., 'ORDER_NOT_FOUND')
  details?: unknown; // 상세 정보
  timestamp: number;
  context?: Record<string, unknown>; // 컨텍스트 정보
}

/**
 * 에러 복구 액션
 */
export interface ErrorRecoveryAction {
  label: string; // 버튼 텍스트
  action: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline';
}

/**
 * 에러 안내 모달/토스트 설정
 */
export interface ErrorGuidance {
  title?: string;
  message: string;
  actions?: ErrorRecoveryAction[];
  autoClose?: number; // ms
  showDetails?: boolean;
}

/**
 * Socket.IO 재연결 설정
 */
export interface ReconnectionConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
}

/**
 * 클라이언트 에러 로그
 */
export interface ClientErrorLog {
  id: string;
  timestamp: number;
  category: ErrorCategory;
  code?: string;
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  context?: Record<string, unknown>;
}
