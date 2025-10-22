/**
 * Vooster 동기화 엔진 메인 진입점
 * @module sync
 */

import pino from 'pino';
import { loadSyncConfig, validateConfig, maskConfig, resolveAbsolutePath } from './config/config';
import { MappingStore } from './store/mappingStore';
import { createVoosterClient } from './api/voosterClient';
import { SyncEngine } from './sync/syncEngine';
import { SyncConfig } from './types';

/**
 * 동기화 엔진 초기화 및 시작
 */
export async function startSyncEngine(customConfig?: Partial<SyncConfig>): Promise<SyncEngine> {
  // 설정 로드
  const config = customConfig
    ? { ...loadSyncConfig(), ...customConfig }
    : loadSyncConfig();

  // 로거 초기화
  const logger = pino({
    name: 'vooster-sync',
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  });

  logger.info({ config: maskConfig(config) }, '동기화 엔진 설정');

  // 설정 검증
  try {
    validateConfig(config);
  } catch (error) {
    logger.error({ error }, '설정 검증 실패');
    throw error;
  }

  // 컴포넌트 초기화
  const dbPath = resolveAbsolutePath(config.dbPath);
  const store = new MappingStore(dbPath);
  const api = createVoosterClient(config, logger);

  const engine = new SyncEngine(config, store, api, logger);

  // 동기화 시작
  await engine.start();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, '종료 시그널 수신');
    await engine.stop();
    store.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return engine;
}

/**
 * CLI 모드로 실행
 */
export async function runCLI(): Promise<void> {
  try {
    const engine = await startSyncEngine();
    console.log('✅ Vooster 동기화 엔진이 시작되었습니다.');
    console.log('📁 감시 중인 디렉터리:', engine['config'].watchDir);
    console.log('🔄 폴링 간격:', engine['config'].pollIntervalMs, 'ms');
    console.log('⏸️  종료하려면 Ctrl+C를 누르세요.');
  } catch (error) {
    console.error('❌ 동기화 엔진 시작 실패:', error);
    process.exit(1);
  }
}

// 직접 실행 시 CLI 모드로 시작
if (require.main === module) {
  runCLI();
}

// 내보내기
export * from './types';
export * from './config/config';
export { MappingStore } from './store/mappingStore';
export { VoosterClient } from './api/voosterClient';
export { ConflictResolver } from './conflict/conflictResolver';
export { SyncEngine } from './sync/syncEngine';
export * from './parser/taskParser';
