/**
 * 트리거 API 라우트
 *
 * 스마트폰 바코드 스캔 후 원격 디스플레이에 제작의뢰서를 표시하는 엔드포인트
 * T-014의 핵심 기능: POST /api/trigger
 */

import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { triggerService } from '../services/triggerService';
import { triggerSchema } from '../schemas/trigger';
import { expressAuthMiddleware, AuthenticatedRequest, requireScope } from '../middleware/expressAuth';
import { triggerIpLimiter, triggerUserLimiter } from '../middleware/rateLimiter';
import { TriggerSuccess, TriggerFailed } from '../types/trigger';
import { logger } from '../utils/logger';

/**
 * 트리거 라우터 팩토리
 *
 * Socket.IO 인스턴스를 주입받아 트리거 라우터를 생성합니다
 *
 * @param io - Socket.IO 서버 인스턴스
 * @returns Express Router
 */
export function createTriggerRouter(io: Server): Router {
  const router = Router();

  /**
   * POST /api/trigger
   *
   * 원격 디스플레이에 navigate 이벤트를 전송합니다
   *
   * 인증 필수: JWT Bearer 토큰
   * 권한 필수: display:{screenId} 스코프
   * Rate Limiting: IP당 초당 10회, 사용자당 분당 100회
   */
  router.post(
    '/',
    expressAuthMiddleware(process.env.SOCKET_JWT_SECRET || ''),
    triggerIpLimiter,
    triggerUserLimiter,
    requireScope((req: AuthenticatedRequest) => {
      const screenId = req.body?.screenId;
      return screenId ? `display:${screenId}` : '';
    }),
    async (req: Request, res: Response) => {
      try {
        // 1. 입력 검증
        const parsed = triggerSchema.safeParse(req.body);

        if (!parsed.success) {
          logger.warn('트리거 검증 실패: errors=%s', JSON.stringify(parsed.error.errors));
          return res.status(400).json({
            ok: false,
            reason: 'validation_error',
            message: '입력값 검증에 실패했습니다.',
            errors: parsed.error.errors,
          });
        }

        const { screenId, jobNo } = parsed.data;

        // 2. 사용자 정보 가져오기
        const user = (req as AuthenticatedRequest).user;
        const userId = user.sub;
        const ipAddress = req.ip || 'unknown';

        // 3. 트리거 실행 (Socket.IO 메시지 전송)
        const result = await triggerService.trigger(io, screenId, jobNo, userId, ipAddress);

        // 4. 전송 성공
        if (result.ok) {
          const response: TriggerSuccess = {
            ok: true,
            txId: result.txId,
            clientCount: result.clientCount!,
            sentAt: Date.now(),
          };

          logger.info('트리거 성공: screenId=%s, jobNo=%s, txId=%s, clientCount=%d, userId=%s', screenId, jobNo, result.txId, result.clientCount || 0, userId);

          return res.json(response);
        }

        // 5. 전송 실패 (클라이언트 없음, 중복 등)
        let statusCode = 400;
        let errorMessage = '메시지 전송에 실패했습니다.';
        let reason: 'validation_error' | 'forbidden' | 'not_found' | 'no_clients' | 'rate_limit' | 'error' = 'error';

        if (result.reason === 'no_clients') {
          statusCode = 503;
          errorMessage = '연결된 클라이언트가 없습니다. 디스플레이가 온라인인지 확인해주세요.';
          reason = 'no_clients';
        } else if (result.reason === 'duplicate') {
          statusCode = 400;
          errorMessage = '중복된 트랜잭션 ID입니다.';
          reason = 'error';
        }

        const response: TriggerFailed = {
          ok: false,
          reason,
          txId: result.txId,
          message: errorMessage,
        };

        logger.warn('트리거 실패: screenId=%s, jobNo=%s, txId=%s, reason=%s', screenId, jobNo, result.txId, result.reason);

        return res.status(statusCode).json(response);
      } catch (error) {
        logger.error('트리거 에러: error=%s', (error as Error).message);
        return res.status(500).json({
          ok: false,
          reason: 'server_error',
          message: '서버 내부 오류가 발생했습니다.',
        });
      }
    }
  );

  return router;
}

export default createTriggerRouter;
