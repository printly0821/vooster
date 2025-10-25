/**
 * 페어링 시스템 타입 정의
 *
 * PC와 스마트폰 간의 WeChat 스타일 QR 기반 페어링 관련 타입들
 */

/**
 * 페어링 세션
 *
 * 데이터베이스에 저장되는 페어링 프로세스의 상태
 * PC가 QR을 생성하면 세션을 만들고, 스마트폰이 승인하면 토큰 발급
 */
export interface PairingSession {
  /** 세션 고유 ID (UUID) */
  sessionId: string;

  /** 페어링 확인 코드 (6자리 숫자, 사용자가 입력) */
  code: string;

  /** 페어링 상태 */
  status: 'pending' | 'approved' | 'expired';

  /** 세션 만료 시간 (기본 5분) */
  expiresAt: Date;

  /** 세션 생성 시간 */
  createdAt: Date;

  /** 세션 수정 시간 */
  updatedAt: Date;

  /** JWT 토큰 (status가 'approved'일 때만 값 있음) */
  token?: string;

  /** 페어링 승인자의 사용자 ID */
  approvedBy?: string;

  /** 페어링 승인 시간 */
  approvedAt?: Date;

  /** 승인자의 IP 주소 */
  approverIp?: string;

  /** 디바이스 ID (승인 후 저장) */
  deviceId?: string;

  /** 조직 ID (승인 후 저장) */
  orgId?: string;

  /** 라인 ID (승인 후 저장) */
  lineId?: string;
}

/**
 * QR 코드 생성 응답
 *
 * POST /api/pair/qr의 응답
 * PC에서 호출하여 스마트폰이 스캔할 QR 코드를 생성
 */
export interface PairQRResponse {
  /** 성공 여부 */
  ok: true;

  /** 페어링 세션 ID (폴링 시 사용) */
  sessionId: string;

  /** QR 코드 데이터 (JSON.stringify({ sessionId, code, wsUrl })) */
  qrData: string;

  /** 세션 만료까지 남은 시간 (초 단위, 기본 300초) */
  expiresIn: number;

  /** 페어링 확인 코드 (UI에 표시, 수동 입력용) */
  code: string;
}

/**
 * QR 코드에 인코딩되는 데이터
 *
 * QR 코드는 이 객체를 JSON.stringify한 문자열을 인코딩
 */
export interface PairQRData {
  /** 페어링 세션 ID */
  sessionId: string;

  /** 페어링 확인 코드 (6자리) */
  code: string;

  /** WebSocket 연결 URL (스마트폰이 승인 후 사용) */
  wsUrl: string;
}

/**
 * 페어링 폴링 응답 (공용 타입)
 *
 * GET /api/pair/poll/:sessionId의 응답
 * PC가 장시간 폴링하여 스마트폰의 승인 확인 (Long Polling, 30초 타임아웃)
 */
export type PairPollResponse = PairPollSuccess | PairPollPending | PairPollFailed;

/**
 * 페어링 폴링 성공 (스마트폰이 승인함)
 */
export interface PairPollSuccess {
  /** 성공 여부 */
  ok: true;

  /** JWT 토큰 (클라이언트 인증용) */
  token: string;

  /** 자동 생성된 화면 ID (screen:orgId:lineId) */
  screenId: string;

  /** 토큰 만료 시간 (Unix 타임스탐프) */
  expiresAt: number;
}

/**
 * 페어링 폴링 대기 중
 */
export interface PairPollPending {
  /** 성공 여부 */
  ok: false;

  /** 실패 이유 */
  reason: 'timeout';
}

/**
 * 페어링 폴링 실패
 */
export interface PairPollFailed {
  /** 성공 여부 */
  ok: false;

  /** 실패 이유 */
  reason: 'not_found' | 'expired';
}

/**
 * 페어링 승인 요청
 *
 * POST /api/pair/approve의 요청 본문
 * 스마트폰이 QR을 스캔하여 sessionId와 code를 확인한 후 서버로 전송
 * JWT 토큰이 필요함 (사용자 인증)
 */
export interface PairApproveRequest {
  /** 페어링 세션 ID (QR에서 추출) */
  sessionId: string;

  /** 페어링 확인 코드 (사용자가 입력하거나 QR에서 추출) */
  code: string;

  /** 디바이스 ID (페어링할 디바이스) */
  deviceId: string;

  /** 조직 ID */
  orgId: string;

  /** 라인 ID */
  lineId: string;
}

/**
 * 페어링 승인 응답 (공용 타입)
 *
 * POST /api/pair/approve의 응답
 */
export type PairApproveResponse = PairApproveSuccess | PairApproveFailed;

/**
 * 페어링 승인 성공
 */
export interface PairApproveSuccess {
  /** 성공 여부 */
  ok: true;

  /** JWT 토큰 (브라우저 확장이 Socket.IO 연결 시 사용) */
  token: string;

  /** 자동 생성된 화면 ID (screen:orgId:lineId) */
  screenId: string;

  /** 토큰 만료 시간 (Unix 타임스탐프) */
  expiresAt: number;
}

/**
 * 페어링 승인 실패
 */
export interface PairApproveFailed {
  /** 성공 여부 */
  ok: false;

  /** 실패 이유 */
  reason: 'invalid_session' | 'expired' | 'invalid_code' | 'validation_error';

  /** 검증 에러 상세 (reason='validation_error'일 때) */
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
