/**
 * 유틸리티 함수 모음
 *
 * 디바이스 ID 생성, 시간 포맷팅 등
 * 애플리케이션 전반에서 사용되는 헬퍼 함수들입니다.
 */

// Storage 키는 현재 파일에서 사용하지 않음 (향후 확장용)

/**
 * UUID v4 생성 (브라우저 표준 API 사용)
 *
 * @returns UUID v4 형식의 문자열
 *
 * @example
 * const id = generateUUID();
 * console.log(id); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 디바이스 ID를 가져오거나 생성
 *
 * Chrome Storage에 저장된 deviceId를 가져오고,
 * 없으면 새로 생성하여 저장합니다.
 *
 * @returns deviceId (UUID v4)
 *
 * @example
 * const deviceId = await getOrCreateDeviceId();
 * console.log(deviceId); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 */
export async function getOrCreateDeviceId(): Promise<string> {
  // 1. Storage에서 기존 deviceId 조회
  const result = await chrome.storage.local.get(['deviceId']);

  if (result.deviceId) {
    return result.deviceId as string;
  }

  // 2. 없으면 새로 생성
  const newDeviceId = generateUUID();

  // 3. Storage에 저장
  await chrome.storage.local.set({ deviceId: newDeviceId });

  return newDeviceId;
}

/**
 * Unix 타임스탬프를 사람이 읽을 수 있는 형식으로 변환
 *
 * @param timestamp - Unix 타임스탬프 (밀리초)
 * @returns 포맷된 시간 문자열 (예: "2분 30초")
 *
 * @example
 * const formatted = formatTime(Date.now() + 150000);
 * console.log(formatted); // "2분 30초"
 */
export function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) {
    return '만료됨';
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}분 ${remainingSeconds}초`;
  }

  return `${remainingSeconds}초`;
}

/**
 * 남은 시간 계산 (초 단위)
 *
 * @param expiresAt - 만료 시간 (Unix timestamp 밀리초)
 * @returns 남은 시간 (초), 만료되었으면 0
 *
 * @example
 * const remaining = getRemainingSeconds(Date.now() + 150000);
 * console.log(remaining); // 150
 */
export function getRemainingSeconds(expiresAt: number): number {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return 0;
  }

  return Math.floor(diff / 1000);
}

/**
 * 디바운스 함수
 *
 * 연속된 호출을 지연시켜 마지막 호출만 실행합니다.
 *
 * @param fn - 실행할 함수
 * @param delay - 지연 시간 (밀리초)
 * @returns 디바운스된 함수
 *
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching:', query);
 * }, 300);
 *
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // 이 호출만 실행됨
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * 에러 메시지 추출
 *
 * Error 객체 또는 문자열에서 사용자에게 표시할 메시지를 추출합니다.
 *
 * @param error - Error 객체 또는 문자열
 * @returns 에러 메시지
 *
 * @example
 * const message = getErrorMessage(new Error('Something went wrong'));
 * console.log(message); // 'Something went wrong'
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '알 수 없는 에러가 발생했습니다.';
}

/**
 * 브라우저 메타데이터 수집
 *
 * 디스플레이 등록 시 전송할 브라우저 정보를 수집합니다.
 *
 * @returns 브라우저 메타데이터 객체
 *
 * @example
 * const metadata = getBrowserMetadata();
 * console.log(metadata); // { browser: 'Chrome', os: 'macOS', ... }
 */
export function getBrowserMetadata(): Record<string, string> {
  const userAgent = navigator.userAgent;

  // 브라우저 감지
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
  }

  // OS 감지
  let os = 'Unknown';
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS')) {
    os = 'iOS';
  }

  return {
    browser,
    os,
    userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
