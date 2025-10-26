/**
 * Socket.IO 서버 타입 정의
 */

/**
 * JWT 토큰 페이로드
 */
export interface JWTPayload {
  sub: string; // 사용자 ID
  role: 'mobile' | 'monitor'; // 역할
  iat?: number; // 발급 시간
  exp?: number; // 만료 시간
}

/**
 * 세션 페어링 JWT 페이로드
 */
export interface SessionPairingPayload {
  sid: string; // 세션 ID
  sub: string; // 사용자 ID
  iat?: number; // 발급 시간
  exp?: number; // 만료 시간
}

/**
 * 페어링 세션 정보
 */
export interface PairingSession {
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  pairingToken: string;
  pairedAt?: number;
  mobileSocketId?: string;
  monitorSocketId?: string;
  status: 'waiting' | 'paired' | 'expired';
}

/**
 * 소켓 사용자 데이터
 */
export interface SocketUser {
  id: string;
  role: 'mobile' | 'monitor';
}

/**
 * 브라우저 확장 원격 디스플레이 클라이언트 페이로드
 *
 * 브라우저 확장에서 Socket.IO 서버에 연결할 때 전송하는 인증 정보
 */
export interface DisplayClientPayload {
  /** 디바이스 고유 ID (UUID 또는 기기 식별자) */
  deviceId: string;
  /** 화면 ID (한 기기에 여러 화면이 있을 수 있음) */
  screenId: string;
  /** JWT 토큰 (서버에서 발급한 토큰) */
  token: string;
}

/**
 * 원격 디스플레이 JWT 토큰 페이로드
 *
 * Socket.IO 서버의 JWT 검증에 사용되는 클레임
 */
export interface DisplayAuthClaims {
  /** 사용자 ID */
  sub: string;
  /** 디바이스 고유 ID */
  deviceId: string;
  /** 화면 ID */
  screenId: string;
  /** 접근 권한 배열 (예: 'display:screen-1', 'display:all') */
  scopes: string[];
  /** 토큰 발급 시간 (Unix 타임스탐프) */
  iat: number;
  /** 토큰 만료 시간 (Unix 타임스탐프) */
  exp: number;
}

/**
 * Socket.IO 소켓 데이터 (디스플레이 클라이언트)
 *
 * socket.data에 저장되는 인증된 클라이언트의 세션 정보
 */
export interface DisplaySocketData {
  /** 디바이스 고유 ID */
  deviceId: string;
  /** 화면 ID */
  screenId: string;
  /** 인증 완료 시간 (Unix 타임스탐프) */
  authenticatedAt: number;
}

/**
 * 세션 정보
 */
export interface SessionInfo {
  sessionId: string;
  mobileSocketId?: string;
  monitorSocketId?: string;
  createdAt: number;
  lastActivity: number;
}

/**
 * Socket.IO 서버 설정
 */
export interface ServerConfig {
  port: number;
  corsOrigins: string[];
  jwtSecret: string;
  redisUrl?: string;
  environment: 'development' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 이벤트 페이로드
 */
export interface EventPayload {
  registerClient: {
    role: 'mobile' | 'monitor';
  };
  joinSession: {
    sessionId: string;
  };
  scanOrder: {
    sessionId: string;
    orderNo: string;
    ts: number;
    nonce?: string;
  };
  navigate: {
    orderNo: string;
    ts: number;
    nonce?: string;
    from: 'mobile' | 'monitor';
  };
  heartbeat: void;
  'heartbeat:ack': number;
  'session:create': void;
  'session:created': {
    sessionId: string;
    pairingToken: string;
    expiresIn: number;
    pairingUrl: string;
  };
  'session:join': {
    sessionId: string;
    pairingToken: string;
  };
  'session:paired': {
    sessionId: string;
    at: number;
  };
  'session:error': {
    code: 'INVALID_TOKEN' | 'SID_MISMATCH' | 'PAIRING_FAILED' | 'SESSION_EXPIRED';
    message: string;
  };
  'session:expired': {
    sessionId: string;
  };
}

/**
 * 로그 항목
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * 채널로 전송되는 메시지
 *
 * Socket.IO 채널을 통해 브라우저 확장으로 전송되는 메시지의 구조
 * txId를 통해 idempotency를 보장하고 중복 처리를 방지합니다
 */
export interface ChannelMessage {
  /** 트랜잭션 ID (idempotency 및 ACK 추적용) */
  txId: string;
  /** 이벤트 타입 (navigate: 페이지 이동, command: 명령 실행, update: 상태 업데이트) */
  eventType: 'navigate' | 'command' | 'update';
  /** 메시지 페이로드 (이벤트 타입별 데이터) */
  payload: any;
  /** 메시지 전송 시간 (Unix 타임스탐프) */
  timestamp: number;
}

/**
 * 클라이언트가 서버로 보내는 ACK 메시지
 *
 * 브라우저 확장이 메시지를 수신하고 처리한 후 서버로 전송하는 확인 응답
 */
export interface AckMessage {
  /** 원본 메시지의 트랜잭션 ID (어떤 메시지에 대한 ACK인지 식별) */
  txId: string;
  /** 실행 결과 (success: 성공, failed: 실패, timeout: 타임아웃) */
  result: 'success' | 'failed' | 'timeout';
  /** 브라우저 탭 ID (선택적, 여러 탭 중 어떤 탭에서 실행되었는지) */
  tabId?: string;
  /** ACK 전송 시간 (Unix 타임스탐프) */
  ts: number;
  /** 실패 시 에러 메시지 (선택적) */
  error?: string;
}

/**
 * 채널 상태 정보
 *
 * 특정 screenId 채널의 현재 상태를 나타냅니다
 */
export interface ChannelStatus {
  /** 화면 ID (채널 식별자) */
  screenId: string;
  /** 현재 연결된 클라이언트 수 */
  connected: number;
  /** 온라인 여부 (1개 이상의 클라이언트가 연결되어 있으면 true) */
  online: boolean;
}

/**
 * emitToChannel 함수의 반환값
 *
 * 채널로 메시지를 전송한 결과를 나타냅니다
 */
export interface EmitResult {
  /** 성공 여부 */
  ok: boolean;
  /** 트랜잭션 ID (성공 시 반환) */
  txId?: string;
  /** 메시지를 받은 클라이언트 수 (성공 시 반환) */
  clientCount?: number;
  /** 실패 이유 (duplicate: 중복 txId, no_clients: 클라이언트 없음, error: 기타 에러) */
  reason?: 'duplicate' | 'no_clients' | 'error';
}
