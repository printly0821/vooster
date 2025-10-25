/**
 * API 요청/응답 타입 정의
 */

import type { Display } from './display';

/**
 * GET /api/displays - 디스플레이 목록 조회 응답
 */
export interface DisplayListResponse {
  /** 디스플레이 배열 */
  displays: Display[];

  /** 전체 개수 */
  total: number;

  /** 온라인 개수 */
  onlineCount: number;
}

/**
 * POST /api/pair/approve - 페어링 승인 요청
 */
export interface PairingApprovalRequest {
  /** 세션 ID */
  sessionId: string;

  /** 확인 코드 */
  code: string;

  /** 디바이스 ID */
  deviceId?: string;

  /** 조직 ID */
  orgId?: string;

  /** 라인 ID */
  lineId?: string;
}

/**
 * POST /api/pair/approve - 페어링 승인 응답 (성공)
 */
export interface PairingApprovalResponse {
  /** 성공 여부 */
  ok: true;

  /** JWT 토큰 */
  token: string;

  /** 디스플레이 ID */
  screenId: string;

  /** 디스플레이 이름 */
  displayName?: string;

  /** 만료 시간 (Unix timestamp, 초 단위) */
  expiresAt?: number;
}

/**
 * POST /api/pair/approve - 페어링 승인 응답 (실패)
 */
export interface PairingApprovalErrorResponse {
  /** 성공 여부 */
  ok: false;

  /** 실패 이유 */
  reason:
    | 'invalid_session'
    | 'expired'
    | 'invalid_code'
    | 'validation_error'
    | 'server_error';

  /** 에러 메시지 */
  message: string;

  /** 상세 에러 정보 */
  details?: Record<string, unknown>;
}

/**
 * POST /api/pair/qr - QR 코드 생성 응답
 */
export interface QRCodeGenerationResponse {
  /** 세션 ID */
  sessionId: string;

  /** QR 코드 데이터 (JSON 문자열) */
  qrData: string;

  /** 만료 시간 (초) */
  expiresIn: number;

  /** 확인 코드 */
  code: string;
}

/**
 * GET /api/pair/poll/:sessionId - 페어링 폴링 응답 (승인됨)
 */
export interface PairingPollSuccessResponse {
  /** 성공 여부 */
  ok: true;

  /** JWT 토큰 */
  token: string;

  /** 디스플레이 ID */
  screenId: string;
}

/**
 * GET /api/pair/poll/:sessionId - 페어링 폴링 응답 (대기 중/타임아웃)
 */
export interface PairingPollPendingResponse {
  /** 실패 여부 */
  ok: false;

  /** 실패 이유 */
  reason: 'timeout' | 'not_found' | 'expired';
}

/**
 * 페어링 폴링 응답 (유니온)
 */
export type PairingPollResponse =
  | PairingPollSuccessResponse
  | PairingPollPendingResponse;

/**
 * GET /api/displays 쿼리 파라미터
 */
export interface DisplayListQueryParams {
  /** 라인 ID 필터 */
  lineId?: string;

  /** 온라인만 표시 */
  onlineOnly?: boolean;

  /** 페이지 번호 */
  page?: number;

  /** 페이지 크기 */
  limit?: number;
}
