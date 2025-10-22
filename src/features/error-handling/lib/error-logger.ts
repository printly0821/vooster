/**
 * 클라이언트 에러 로깅 시스템 (T-008)
 * 사용자 행동을 방해하지 않으면서 에러를 샘플링하여 서버에 전송
 */

import type { AppError, ClientErrorLog, ErrorCategory } from '../types';

/**
 * 로깅 샘플링 설정
 */
const SAMPLING_RATES: Record<ErrorCategory, number> = {
  network: 1.0, // 100% (중요)
  order: 0.5, // 50%
  monitor: 1.0, // 100% (중요)
  permission: 0.3, // 30%
  socket: 1.0, // 100% (중요)
  camera: 0.5, // 50%
  unknown: 0.1, // 10%
};

/**
 * 로컬 로그 저장소 (최대 50개)
 */
class ClientErrorLogStore {
  private logs: ClientErrorLog[] = [];
  private readonly maxLogs = 50;
  private readonly storageKey = '__app_error_logs';

  constructor() {
    this.loadFromStorage();
  }

  add(log: ClientErrorLog): void {
    this.logs.push(log);

    // 최대 개수 초과 시 오래된 항목 제거
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 주기적으로 저장 (비동기)
    this.saveToStorage();
  }

  getLogs(): ClientErrorLog[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Failed to save error logs to localStorage', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load error logs from localStorage', e);
    }
  }
}

const logStore = new ClientErrorLogStore();

/**
 * 에러를 클라이언트 로그로 변환
 */
function appErrorToClientLog(error: AppError): ClientErrorLog {
  return {
    id: error.id,
    timestamp: error.timestamp,
    category: error.category,
    code: error.code,
    message: error.message,
    stack: error.details instanceof Error ? error.details.stack : undefined,
    userAgent: navigator.userAgent,
    url: window.location.href,
    context: error.context,
  };
}

/**
 * 샘플링 결정
 */
function shouldSample(category: ErrorCategory): boolean {
  const rate = SAMPLING_RATES[category] || 0.1;
  return Math.random() < rate;
}

/**
 * 에러 로깅 (샘플링 적용)
 */
export async function logErrorToServer(error: AppError): Promise<void> {
  // 로컬 저장
  const clientLog = appErrorToClientLog(error);
  logStore.add(clientLog);

  // 샘플링 체크
  if (!shouldSample(error.category)) {
    return;
  }

  // 서버로 전송 (비동기, 실패해도 무시)
  try {
    await fetch('/api/logs/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientLog),
    }).catch(() => {
      // 서버 전송 실패는 무시 (사용자 경험 방해 금지)
    });
  } catch {
    // 네트워크 오류도 무시
  }
}

/**
 * 저장된 에러 로그 조회
 */
export function getStoredErrorLogs(): ClientErrorLog[] {
  return logStore.getLogs();
}

/**
 * 에러 로그 저장소 초기화
 */
export function clearErrorLogs(): void {
  logStore.clear();
}

/**
 * 에러 로그 배치 내보내기
 */
export async function exportErrorLogs(): Promise<void> {
  const logs = logStore.getLogs();
  if (logs.length === 0) {
    console.info('No error logs to export');
    return;
  }

  try {
    await fetch('/api/logs/errors/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    });

    console.info(`Exported ${logs.length} error logs`);
  } catch (e) {
    console.error('Failed to export error logs', e);
  }
}
