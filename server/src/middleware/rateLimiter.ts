/**
 * Rate Limiting 미들웨어
 *
 * API 엔드포인트별로 세분화된 요청 제한을 적용합니다
 * - IP 기반 제한: DDoS 공격 방지
 * - 사용자 기반 제한: 남용 방지
 */

import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * 트리거 API - IP 기반 제한 (초당 10회)
 *
 * 동일 IP에서 초당 10회 이상 요청 시 429 반환
 */
export const triggerIpLimiter = rateLimit({
  windowMs: 1000, // 1초
  max: 10, // 최대 10회
  message: {
    ok: false,
    reason: 'rate_limit_exceeded',
    message: 'IP 기반 요청 제한을 초과했습니다. 초당 최대 10회까지 허용됩니다.',
  },
  standardHeaders: true, // RateLimit-* 헤더 반환
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
});

/**
 * 트리거 API - 사용자 기반 제한 (분당 100회)
 *
 * 동일 사용자(JWT sub)에서 분당 100회 이상 요청 시 429 반환
 */
export const triggerUserLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100, // 최대 100회
  message: {
    ok: false,
    reason: 'rate_limit_exceeded',
    message: '사용자 기반 요청 제한을 초과했습니다. 분당 최대 100회까지 허용됩니다.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.sub || req.ip || 'unknown';
  },
  skip: (req: Request) => {
    // 인증되지 않은 요청은 IP 기반만 적용
    const user = (req as any).user;
    return !user;
  },
});

/**
 * 디스플레이 등록 API - IP 기반 제한 (분당 60회)
 *
 * heartbeat는 30초마다 전송되므로 여유 있게 분당 60회 허용
 */
export const displayRegisterLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 60, // 최대 60회
  message: {
    ok: false,
    reason: 'rate_limit_exceeded',
    message: '등록 요청 제한을 초과했습니다. 분당 최대 60회까지 허용됩니다.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
});

/**
 * 페어링 API - IP 기반 제한 (분당 20회)
 *
 * QR 생성, 폴링, 승인 등 페어링 관련 API 제한
 */
export const pairingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 20, // 최대 20회
  message: {
    ok: false,
    reason: 'rate_limit_exceeded',
    message: '페어링 요청 제한을 초과했습니다. 분당 최대 20회까지 허용됩니다.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
});

/**
 * 디스플레이 목록 조회 - 사용자 기반 제한 (분당 30회)
 *
 * 목록 조회는 자주 호출될 수 있으므로 적절히 제한
 */
export const displayListLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30, // 최대 30회
  message: {
    ok: false,
    reason: 'rate_limit_exceeded',
    message: '목록 조회 제한을 초과했습니다. 분당 최대 30회까지 허용됩니다.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.sub || req.ip || 'unknown';
  },
});
