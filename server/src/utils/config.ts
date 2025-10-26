/**
 * 환경변수 설정 및 검증
 */

import { ServerConfig } from '../types/index.js';

/**
 * 환경변수에서 설정을 로드하고 검증합니다.
 */
export function loadConfig(): ServerConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(origin => origin.trim());
  const jwtSecret = process.env.SOCKET_JWT_SECRET || 'dev-secret-key-change-in-production';
  const redisUrl = process.env.REDIS_URL;
  const environment = (process.env.NODE_ENV as 'development' | 'production') || 'development';
  const logLevel = (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';

  if (!jwtSecret || jwtSecret === 'dev-secret-key-change-in-production') {
    if (environment === 'production') {
      throw new Error('SOCKET_JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }
    console.warn('경고: 기본 JWT 비밀키를 사용 중입니다. 프로덕션 환경에서는 변경해주세요.');
  }

  return {
    port,
    corsOrigins,
    jwtSecret,
    redisUrl,
    environment,
    logLevel,
  };
}

/**
 * 설정값이 유효한지 확인합니다.
 */
export function validateConfig(config: ServerConfig): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`유효하지 않은 포트 번호: ${config.port}`);
  }

  if (config.corsOrigins.length === 0) {
    throw new Error('최소 하나의 CORS 원본이 필요합니다.');
  }

  if (!config.jwtSecret || config.jwtSecret.length < 8) {
    throw new Error('JWT 비밀키는 8자 이상이어야 합니다.');
  }
}
