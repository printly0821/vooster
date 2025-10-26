/**
 * 디스플레이 관리 API 라우트
 *
 * 브라우저 확장 디스플레이의 등록 및 조회 엔드포인트를 제공합니다
 */

import { Router, Request, Response } from 'express';
import { displayService } from '../services/displayService';
import { displayRegisterSchema, displayQuerySchema } from '../schemas/display';
import { expressAuthMiddleware } from '../middleware/expressAuth';
import { displayRegisterLimiter, displayListLimiter } from '../middleware/rateLimiter';
import { DisplayRegisterResponse, DisplayListResponse } from '../types/display';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/displays/register
 *
 * 디스플레이를 등록하거나 heartbeat를 업데이트합니다
 * 브라우저 확장이 30초마다 호출하여 온라인 상태를 유지합니다
 */
router.post('/register', displayRegisterLimiter, async (req: Request, res: Response) => {
  try {
    // 1. 입력 검증
    const parsed = displayRegisterSchema.safeParse(req.body);

    if (!parsed.success) {
      // 검증 에러를 상세히 로깅 (각 필드별 에러 메시지)
      const errorDetails = parsed.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      logger.warn(
        '디스플레이 등록 검증 실패: deviceId=%s, errors=%s',
        req.body.deviceId || 'N/A',
        JSON.stringify(errorDetails)
      );
      return res.status(400).json({
        ok: false,
        reason: 'validation_error',
        message: '입력값 검증에 실패했습니다.',
        // Extension 개발자를 위한 상세 에러 정보
        details: {
          fields: errorDetails,
          received: {
            deviceId: req.body.deviceId,
            name: req.body.name,
            purpose: req.body.purpose,
            orgId: req.body.orgId,
            lineId: req.body.lineId,
          },
        },
      });
    }

    const data = parsed.data;

    // 2. 디스플레이 등록/업데이트
    const display = await displayService.register(data);

    // 3. 등록 여부 판단 (신규 vs 업데이트)
    const isNewRegistration = display.createdAt.getTime() === display.updatedAt.getTime();

    // 4. 응답 반환
    const response: DisplayRegisterResponse = {
      ok: true,
      screenId: display.screenId,
      status: isNewRegistration ? 'registered' : 'updated',
    };

    logger.info('디스플레이 등록 성공: deviceId=%s, screenId=%s, status=%s', data.deviceId, display.screenId, response.status);

    return res.json(response);
  } catch (error) {
    logger.error('디스플레이 등록 에러: error=%s', (error as Error).message);
    return res.status(500).json({
      ok: false,
      reason: 'server_error',
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/displays
 *
 * 디스플레이 목록을 조회합니다
 * 쿼리 파라미터로 lineId 필터링 및 온라인만 조회 가능
 *
 * 인증 필수: JWT Bearer 토큰
 */
router.get('/', expressAuthMiddleware(process.env.SOCKET_JWT_SECRET || ''), displayListLimiter, async (req: Request, res: Response) => {
  try {
    // 1. 쿼리 파라미터 검증
    const parsed = displayQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      logger.warn('디스플레이 목록 조회 검증 실패: errors=%s', JSON.stringify(parsed.error.errors));
      return res.status(400).json({
        ok: false,
        reason: 'validation_error',
        message: '쿼리 파라미터 검증에 실패했습니다.',
        errors: parsed.error.errors,
      });
    }

    const options = parsed.data;

    // 2. 디스플레이 목록 조회
    const displays = await displayService.list(options);

    // 3. 응답 반환
    const response: DisplayListResponse = {
      ok: true,
      displays,
    };

    logger.info('디스플레이 목록 조회 성공: lineId=%s, onlineOnly=%s, count=%d', options.lineId || 'all', options.onlineOnly, displays.length);

    return res.json(response);
  } catch (error) {
    logger.error('디스플레이 목록 조회 에러: error=%s', (error as Error).message);
    return res.status(500).json({
      ok: false,
      reason: 'server_error',
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

export default router;
