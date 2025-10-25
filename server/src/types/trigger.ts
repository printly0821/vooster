/**
 * 트리거 시스템 타입 정의
 *
 * 스마트폰의 바코드 스캔 후 원격 디스플레이에 제작의뢰서를 표시하는 기능 관련 타입들
 */

/**
 * 트리거 요청
 *
 * POST /api/trigger의 요청 본문
 * 스마트폰이 바코드를 스캔한 후 해당 주문을 원격 디스플레이에 표시하도록 요청
 * JWT Bearer 토큰이 필수 (사용자 인증)
 */
export interface TriggerRequest {
  /** 화면 ID (screen:orgId:lineId 형식) */
  screenId: string;

  /** 주문 번호 */
  jobNo: string;

  /** 선택적: 커스텀 데이터 (향후 확장용) */
  metadata?: Record<string, any>;
}

/**
 * 트리거 응답 (공용 타입)
 *
 * POST /api/trigger의 응답
 */
export type TriggerResponse = TriggerSuccess | TriggerFailed;

/**
 * 트리거 성공 (메시지가 클라이언트로 전송됨)
 */
export interface TriggerSuccess {
  /** 성공 여부 */
  ok: true;

  /** 트랜잭션 ID (메시지 추적용, 중복 방지) */
  txId: string;

  /** 메시지를 받은 클라이언트 수 */
  clientCount: number;

  /** 메시지 전송 시간 (Unix 타임스탐프) */
  sentAt: number;
}

/**
 * 트리거 실패
 */
export interface TriggerFailed {
  /** 성공 여부 */
  ok: false;

  /** 트랜잭션 ID (부분 실패 시에도 생성) */
  txId: string;

  /** 실패 이유 */
  reason:
    | 'validation_error'    // 입력 검증 실패
    | 'forbidden'           // 권한 부족
    | 'not_found'           // 디스플레이를 찾을 수 없음
    | 'no_clients'          // 해당 디스플레이에 연결된 클라이언트 없음
    | 'rate_limit'          // Rate limit 초과
    | 'error';              // 기타 에러

  /** 검증 에러 상세 (reason='validation_error'일 때) */
  errors?: Array<{
    field: string;
    message: string;
  }>;

  /** 에러 메시지 (reason='error'일 때) */
  message?: string;
}

/**
 * 트리거 로그
 *
 * 모든 트리거 API 호출을 기록하여 감시, 감사, 분석에 사용
 */
export interface TriggerLog {
  /** 로그 ID */
  id: string;

  /** 트리거를 요청한 사용자 ID */
  userId: string;

  /** 대상 화면 ID */
  screenId: string;

  /** 주문 번호 */
  jobNo: string;

  /** 트랜잭션 ID (메시지 추적용) */
  txId: string;

  /** 전송 상태 */
  status: 'delivered' | 'missed';

  /** 메시지를 받은 클라이언트 수 (delivered면 >= 1, missed면 0) */
  clientCount: number;

  /** 요청자 IP 주소 */
  ip: string;

  /** 요청 시간 */
  timestamp: Date;

  /** 응답 코드 (HTTP status) */
  statusCode: number;

  /** 에러 메시지 (실패 시) */
  errorMessage?: string;
}

/**
 * 트리거 페이로드 (WebSocket으로 전송)
 *
 * ChannelMessage의 payload 필드에 이 데이터가 포함됨
 */
export interface TriggerPayload {
  /** 이벤트 타입 */
  type: 'navigate';

  /** 트랜잭션 ID */
  txId: string;

  /** 대상 화면 ID */
  screenId: string;

  /** 주문 번호 */
  jobNo: string;

  /** 네비게이션 URL (디스플레이가 이동할 페이지) */
  url: string;

  /** 메시지 생성 시간 (Unix 타임스탐프) */
  ts: number;

  /** 메시지 만료 시간 (Unix 타임스탐프, 기본 1분 후) */
  exp: number;

  /** 선택적 메타데이터 */
  metadata?: Record<string, any>;
}
