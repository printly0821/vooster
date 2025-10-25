/**
 * 백엔드 API 클라이언트
 *
 * T-014에서 구현된 서버 API와 통신하는 클라이언트 함수들입니다.
 * 모든 함수는 타입 안전하며, 에러 처리를 포함합니다.
 */

import type {
  RegisterDisplayRequest,
  RegisterDisplayResponse,
  CreatePairingQRRequest,
  CreatePairingQRResponse,
  PollPairingResponse,
  ApiErrorResponse,
} from '../types/api';
import { API_BASE_URL, API_ENDPOINTS } from '../types/api';

/**
 * API 에러 클래스
 *
 * 서버 응답 에러를 래핑하여 타입 안전한 에러 처리를 제공합니다.
 */
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * HTTP 요청 헬퍼 함수
 *
 * @param endpoint - API 엔드포인트 경로
 * @param options - fetch 옵션
 * @returns JSON 응답 데이터
 * @throws {ApiError} API 에러 발생 시
 *
 * @private 내부 함수로, 다른 API 함수에서만 사용
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    // HTTP 에러 처리
    if (!response.ok) {
      const error = data as ApiErrorResponse;
      throw new ApiError(
        error.code || response.status,
        error.message || 'Unknown error',
        error.details
      );
    }

    return data as T;
  } catch (error) {
    // 네트워크 에러 또는 JSON 파싱 에러
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      0,
      '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.',
      { originalError: error }
    );
  }
}

/**
 * 디스플레이 등록 API
 *
 * 새로운 디스플레이를 서버에 등록하고 displayId를 받습니다.
 *
 * @param requestData - 디스플레이 정보 (deviceId, name, metadata)
 * @returns 서버에서 생성한 displayId
 * @throws {ApiError} 등록 실패 시
 *
 * @example
 * const response = await registerDisplay({
 *   deviceId: 'uuid-v4-string',
 *   name: 'My Display',
 *   metadata: { browser: 'Chrome' }
 * });
 * console.log(response.displayId); // 'display-uuid'
 */
export async function registerDisplay(
  requestData: RegisterDisplayRequest
): Promise<RegisterDisplayResponse> {
  return await request<RegisterDisplayResponse>(
    API_ENDPOINTS.REGISTER_DISPLAY,
    {
      method: 'POST',
      body: JSON.stringify(requestData),
    }
  );
}

/**
 * 페어링 QR 코드 생성 API
 *
 * 디스플레이에 대한 페어링 토큰을 생성합니다.
 * 생성된 토큰은 QR 코드로 렌더링됩니다.
 *
 * @param requestData - displayId와 선택적 ttl (기본 3분)
 * @returns 페어링 토큰과 만료 시간
 * @throws {ApiError} QR 생성 실패 시
 *
 * @example
 * const response = await createPairingQR({
 *   displayId: 'display-uuid',
 *   ttl: 180000 // 3분
 * });
 * console.log(response.pairingToken); // 'ABC123'
 */
export async function createPairingQR(
  requestData: CreatePairingQRRequest
): Promise<CreatePairingQRResponse> {
  return await request<CreatePairingQRResponse>(
    API_ENDPOINTS.CREATE_PAIRING_QR,
    {
      method: 'POST',
      body: JSON.stringify(requestData),
    }
  );
}

/**
 * 페어링 폴링 API
 *
 * 3초 간격으로 호출하여 페어링 완료 여부를 확인합니다.
 * 페어링이 완료되면 WebSocket URL과 JWT 토큰을 받습니다.
 *
 * @param displayId - 등록된 디스플레이 ID
 * @returns 페어링 상태와 인증 정보
 * @throws {ApiError} 폴링 실패 시
 *
 * @example
 * const response = await pollPairing('display-uuid');
 * if (response.isPaired) {
 *   console.log(response.wsServerUrl); // 'ws://localhost:3000'
 *   console.log(response.authToken); // 'jwt-token'
 * }
 */
export async function pollPairing(
  displayId: string
): Promise<PollPairingResponse> {
  return await request<PollPairingResponse>(
    `${API_ENDPOINTS.POLL_PAIRING}/${displayId}`,
    {
      method: 'GET',
    }
  );
}
