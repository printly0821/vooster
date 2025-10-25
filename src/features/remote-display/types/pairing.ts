/**
 * 페어링 관련 타입 정의
 *
 * QR 코드 기반 WeChat 스타일 페어링 시스템
 */

/**
 * QR 코드 페이로드 (PC 확장이 생성)
 */
export interface QRCodePayload {
  /** 페어링 세션 ID */
  sessionId: string;

  /** 6자리 확인 코드 */
  code: string;

  /** WebSocket 서버 URL */
  wsUrl: string;

  /** 디스플레이 이름 (승인 확인 모달용) */
  displayName: string;

  /** 디스플레이 용도 */
  purpose?: string;

  /** 조직 ID */
  orgId?: string;

  /** 라인 ID */
  lineId?: string;

  /** 만료 시간 (Unix timestamp) */
  expiresAt?: number;
}

/**
 * 페어링 세션 상태
 */
export type PairingStatus = 'pending' | 'approved' | 'expired' | 'rejected';

/**
 * 페어링 세션 정보
 */
export interface PairingSession {
  /** 세션 ID */
  sessionId: string;

  /** 확인 코드 */
  code: string;

  /** 상태 */
  status: PairingStatus;

  /** 디스플레이 ID */
  screenId?: string;

  /** 생성 시간 */
  createdAt: string;

  /** 만료 시간 */
  expiresAt: string;

  /** 승인한 사용자 ID */
  approvedBy?: string;

  /** 승인 시간 */
  approvedAt?: string;
}

/**
 * 페어링 모드
 */
export type PairingMode = 'scan' | 'manual' | 'list';
