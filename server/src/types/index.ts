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
