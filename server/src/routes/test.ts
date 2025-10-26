/**
 * 테스트 API 라우트 (개발 환경 전용)
 *
 * E2E 테스트를 위한 데이터 초기화 및 헬퍼 API를 제공합니다.
 * 프로덕션 환경에서는 비활성화됩니다.
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/test/reset
 *
 * E2E 테스트 간 상태 초기화
 * - 메모리 Repository 초기화
 * - Redis 캐시 초기화 (향후 구현)
 * - Channel Manager 캐시 초기화
 *
 * @example
 * POST /api/test/reset
 * Response: { ok: true, message: '테스트 데이터 초기화 완료' }
 */
router.post('/reset', async (_req: Request, res: Response) => {
  try {
    logger.info('테스트 데이터 리셋 요청');

    // TODO: Repository 초기화 (Phase 4에서 구현)
    // displayRepository.clear();
    // pairingRepository.clear();

    // TODO: Channel Manager 캐시 초기화
    // channelManager.clearCache();

    logger.info('✅ 테스트 데이터 리셋 완료');

    return res.json({
      ok: true,
      message: '테스트 데이터 초기화 완료',
    });
  } catch (error) {
    logger.error('테스트 데이터 리셋 실패: %s', (error as Error).message);

    return res.status(500).json({
      ok: false,
      reason: 'reset_failed',
      message: '테스트 데이터 초기화에 실패했습니다.',
    });
  }
});

export default router;
