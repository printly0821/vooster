/**
 * 디스플레이 관련 타입 정의
 *
 * 원격 PC 디스플레이 등록, 조회, 상태 관리와 관련된 타입들
 */

/**
 * 디스플레이 등록 요청
 *
 * 브라우저 확장이 서버에 자신을 등록할 때 전송하는 페이로드
 * 30초마다 heartbeat로 호출되어 last_seen_at 업데이트
 */
export interface DisplayRegisterRequest {
  /** 디바이스 고유 ID (UUID 또는 기기 식별자) */
  deviceId: string;

  /** 디스플레이 이름 (UI에 표시할 사용자 친화적 이름) */
  name: string;

  /** 디스플레이 용도 (예: '제조 공정 모니터링', '품질 검사') */
  purpose: string;

  /** 조직 ID (권한 관리용) */
  orgId: string;

  /** 라인 ID (생산 라인 식별) */
  lineId: string;
}

/**
 * 디스플레이 정보
 *
 * 데이터베이스에 저장되는 디스플레이의 상태 정보
 */
export interface Display {
  /** 디바이스 고유 ID */
  deviceId: string;

  /** 화면 ID (자동 생성, screen:orgId:lineId 형식) */
  screenId: string;

  /** 디스플레이 이름 */
  name: string;

  /** 디스플레이 용도 */
  purpose: string;

  /** 조직 ID */
  orgId: string;

  /** 라인 ID */
  lineId: string;

  /** 마지막 heartbeat 시간 (온라인 상태 판단에 사용) */
  lastSeenAt: Date;

  /** 온라인 상태 ('online' = 60초 이내 heartbeat, 'offline' = 미갱신) */
  status: 'online' | 'offline';

  /** 데이터 생성 시간 */
  createdAt: Date;

  /** 데이터 마지막 수정 시간 */
  updatedAt: Date;
}

/**
 * 디스플레이 등록 응답
 *
 * POST /api/displays/register의 응답
 */
export interface DisplayRegisterResponse {
  /** 성공 여부 */
  ok: true;

  /** 자동 생성된 화면 ID (screen:orgId:lineId 형식) */
  screenId: string;

  /** 디스플레이 상태 */
  status: 'registered' | 'updated';
}

/**
 * 디스플레이 요약 정보
 *
 * 목록 조회 시 반환되는 간단한 정보
 */
export interface DisplaySummary {
  /** 화면 ID (screen:orgId:lineId) */
  screenId: string;

  /** 디스플레이 이름 */
  name: string;

  /** 디스플레이 용도 */
  purpose: string;

  /** 온라인 여부 (마지막 heartbeat이 60초 이내면 true) */
  online: boolean;

  /** 마지막 접속 시간 */
  lastSeen: Date;
}

/**
 * 디스플레이 목록 조회 응답
 *
 * GET /api/displays의 응답
 * 스마트폰이 호출하여 특정 라인의 온라인 디스플레이 목록을 조회
 */
export interface DisplayListResponse {
  /** 성공 여부 */
  ok: true;

  /** 디스플레이 목록 */
  displays: DisplaySummary[];
}

/**
 * 디스플레이 조회 필터 옵션
 *
 * GET /api/displays의 쿼리 파라미터
 */
export interface DisplayQueryOptions {
  /** 라인 ID로 필터링 (선택적) */
  lineId?: string;

  /** 온라인 상태만 조회할지 여부 (기본값: true) */
  onlineOnly?: boolean;

  /** 조회 결과 수 제한 (기본값: 100) */
  limit?: number;
}
