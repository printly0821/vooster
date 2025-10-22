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
