/**
 * 에러 처리 유틸리티 (T-008)
 */

import { nanoid } from 'nanoid';
import type { AppError, ErrorCategory, ErrorSeverity, ErrorGuidance } from '../types';

/**
 * 에러 인스턴스 생성
 */
export function createError(
  category: ErrorCategory,
  message: string,
  options?: {
    code?: string;
    severity?: ErrorSeverity;
    details?: unknown;
    context?: Record<string, unknown>;
  }
): AppError {
  return {
    id: nanoid(),
    category,
    severity: options?.severity || 'error',
    message,
    code: options?.code,
    details: options?.details,
    timestamp: Date.now(),
    context: options?.context,
  };
}

/**
 * 에러별 사용자 안내 메시지 매핑
 */
export function getErrorGuidance(error: AppError): ErrorGuidance {
  switch (error.category) {
    case 'network':
      return {
        title: '네트워크 연결 오류',
        message: '인터넷 연결을 확인해주세요. 자동으로 재연결을 시도하고 있습니다.',
        autoClose: 5000,
      };

    case 'order':
      if (error.code === 'ORDER_NOT_FOUND') {
        return {
          title: '주문을 찾을 수 없습니다',
          message: '입력하신 주문번호를 다시 확인해주세요.',
          actions: [
            {
              label: '최근 스캔 내역으로',
              action: () => { window.location.hash = '#history'; },
            },
          ],
          autoClose: 5000,
        };
      }
      return {
        title: '주문 조회 실패',
        message: '주문 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.',
        autoClose: 5000,
      };

    case 'monitor':
      if (error.code === 'MONITOR_NOT_PAIRED') {
        return {
          title: '세컨드 모니터 미연결',
          message: '세컨드 모니터와 페어링되지 않았습니다. QR 코드를 다시 스캔해주세요.',
          autoClose: 0, // 사용자 액션 필요
        };
      }
      return {
        title: '모니터 연결 실패',
        message: '세컨드 모니터 연결을 확인해주세요.',
        autoClose: 5000,
      };

    case 'permission':
      if (error.code === 'CAMERA_PERMISSION_DENIED') {
        return {
          title: '카메라 권한이 필요합니다',
          message: '바코드를 스캔하려면 카메라 권한을 허용해야 합니다. 브라우저 설정에서 권한을 변경해주세요.',
          autoClose: 0,
        };
      }
      if (error.code === 'POPUP_BLOCKED') {
        return {
          title: '팝업 차단됨',
          message: '제작의뢰서를 표시하려면 팝업 차단을 해제해주세요.',
          actions: [
            {
              label: '수동으로 열기',
              action: () => { window.location.hash = '#open-manual'; },
            },
          ],
          autoClose: 0,
        };
      }
      return {
        title: '권한 거부됨',
        message: '필요한 권한을 허용해주세요.',
        autoClose: 5000,
      };

    case 'socket':
      return {
        title: '서버 연결 오류',
        message: '서버와의 연결이 끊어졌습니다. 재연결 중입니다.',
        autoClose: 5000,
      };

    case 'camera':
      return {
        title: '카메라 오류',
        message: '카메라를 사용할 수 없습니다. 기기를 재시작해주세요.',
        autoClose: 5000,
      };

    default:
      return {
        title: '오류 발생',
        message: error.message,
        autoClose: 5000,
      };
  }
}

/**
 * 에러 심각도에 따른 로그 레벨 결정
 */
export function getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
  switch (severity) {
    case 'info':
      return 'log';
    case 'warning':
      return 'warn';
    case 'error':
    case 'critical':
      return 'error';
  }
}

/**
 * 에러를 콘솔에 로깅
 */
export function logError(error: AppError): void {
  const level = getLogLevel(error.severity);
  console[level](
    `[${error.id}] ${error.category.toUpperCase()}: ${error.message}`,
    {
      code: error.code,
      details: error.details,
      context: error.context,
    }
  );
}

/**
 * 재시도 가능한 에러인지 확인
 */
export function isRetryable(error: AppError): boolean {
  // 재시도 가능한 에러 카테고리
  const retryableCategories: ErrorCategory[] = ['network', 'socket'];

  if (retryableCategories.includes(error.category)) {
    return true;
  }

  // 특정 주문 조회 오류는 재시도 불가
  if (error.category === 'order' && error.code === 'ORDER_NOT_FOUND') {
    return false;
  }

  return false;
}

/**
 * 지수 백오프 계산
 */
export function calculateBackoffDelay(
  retryCount: number,
  initialDelay: number = 1000,
  maxDelay: number = 15000,
  multiplier: number = 2
): number {
  const delay = initialDelay * Math.pow(multiplier, retryCount);
  return Math.min(delay, maxDelay);
}
