/**
 * 페어링 API 라우트
 *
 * WeChat 스타일 QR 기반 페어링 엔드포인트를 제공합니다
 * - QR 생성 (POST /api/pair/qr)
 * - 폴링 (GET /api/pair/poll/:sessionId)
 * - 승인 (POST /api/pair/approve)
 */

import { Router, Request, Response } from 'express';
import { pairingService } from '../services/pairingService';
import { pairApproveSchema } from '../schemas/pairing';
import { expressAuthMiddleware, AuthenticatedRequest } from '../middleware/expressAuth';
import { pairingLimiter } from '../middleware/rateLimiter';
import { PairQRResponse, PairPollSuccess, PairApproveSuccess, PairApproveFailed, PairPollResponse } from '../types/pairing';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/pair/qr
 *
 * 새로운 페어링 세션을 생성하고 QR 데이터를 반환합니다
 * 인증 불필요 (PC에서 호출)
 */
router.post('/qr', pairingLimiter, async (_req: Request, res: Response) => {
  try {
    // 1. WebSocket URL 가져오기
    const wsUrl = process.env.WS_URL || 'ws://localhost:3000';

    // 2. QR 세션 생성
    const { session, qrData } = await pairingService.createQR(wsUrl);

    // 3. 응답 반환
    const response: PairQRResponse = {
      ok: true,
      sessionId: session.sessionId,
      code: session.code,
      qrData,
      expiresIn: 300, // 5분
    };

    logger.info('QR 생성 성공: sessionId=%s, code=%s', session.sessionId, session.code);

    return res.json(response);
  } catch (error) {
    logger.error('QR 생성 에러: error=%s', (error as Error).message);
    return res.status(500).json({
      ok: false,
      reason: 'server_error',
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/pair/poll/:sessionId
 *
 * 페어링 승인을 폴링합니다 (Long Polling, 최대 30초 대기)
 * 인증 불필요 (PC에서 호출)
 */
router.get('/poll/:sessionId', pairingLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // 1. 폴링 시작 (최대 30초 대기)
    const session = await pairingService.poll(sessionId, 30000);

    // 2. 승인된 경우
    if (session && session.status === 'approved' && session.token) {
      const screenId = `screen:${session.orgId}:${session.lineId}`;

      const response: PairPollSuccess = {
        ok: true,
        token: session.token,
        screenId,
        expiresAt: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1년
      };

      logger.info('폴링 성공: sessionId=%s, screenId=%s', sessionId, screenId);
      return res.json(response);
    }

    // 3. 타임아웃 또는 만료
    const response: PairPollResponse = session
      ? {
          ok: false,
          reason: 'timeout',
        }
      : {
          ok: false,
          reason: 'not_found',
        };

    logger.debug('폴링 실패: sessionId=%s, reason=%s', sessionId, response.reason);
    return res.status(session ? 200 : 404).json(response);
  } catch (error) {
    logger.error('폴링 에러: sessionId=%s, error=%s', req.params.sessionId, (error as Error).message);
    return res.status(500).json({
      ok: false,
      reason: 'server_error',
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/pair/approve
 *
 * 스마트폰에서 QR 스캔 후 페어링을 승인합니다
 * 인증 필수: JWT Bearer 토큰
 */
router.post('/approve', expressAuthMiddleware(process.env.SOCKET_JWT_SECRET || ''), pairingLimiter, async (req: Request, res: Response) => {
  try {
    // 1. 입력 검증
    const parsed = pairApproveSchema.safeParse(req.body);

    if (!parsed.success) {
      logger.warn('페어링 승인 검증 실패: errors=%s', JSON.stringify(parsed.error.errors));
      return res.status(400).json({
        ok: false,
        reason: 'validation_error',
        message: '입력값 검증에 실패했습니다.',
        errors: parsed.error.errors,
      });
    }

    const { sessionId, code } = parsed.data;

    // 2. 승인한 사용자 정보 가져오기
    const user = (req as AuthenticatedRequest).user;
    const approvedBy = user.sub;

    // 3. 요청 본문에서 deviceId, orgId, lineId 추출
    const { deviceId, orgId, lineId } = req.body;

    // 4. 페어링 승인 처리
    const jwtSecret = process.env.SOCKET_JWT_SECRET || '';
    const result = await pairingService.approve(sessionId, code, approvedBy, deviceId, orgId, lineId, jwtSecret);

    if (!result) {
      const response: PairApproveFailed = {
        ok: false,
        reason: 'invalid_session',
      };

      logger.warn('페어링 승인 실패: sessionId=%s, code=%s, approvedBy=%s', sessionId, code, approvedBy);
      return res.status(400).json(response);
    }

    // 5. 성공 응답
    const response: PairApproveSuccess = {
      ok: true,
      token: result.token,
      screenId: result.screenId,
      expiresAt: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1년
    };

    logger.info('페어링 승인 성공: sessionId=%s, screenId=%s, approvedBy=%s', sessionId, result.screenId, approvedBy);

    return res.json(response);
  } catch (error) {
    logger.error('페어링 승인 에러: error=%s', (error as Error).message);
    return res.status(500).json({
      ok: false,
      reason: 'server_error',
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

export default router;
