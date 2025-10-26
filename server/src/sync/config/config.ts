/**
 * Vooster 동기화 엔진 설정 로더
 * @module sync/config
 */

import { SyncConfig, SyncConfigSchema, DeletePolicy } from '../types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env 파일 로드
dotenv.config();

/**
 * 환경 변수에서 동기화 설정 로드
 */
export function loadSyncConfig(): SyncConfig {
  const config: SyncConfig = {
    baseURL: process.env.VOOSTER_BASE_URL || 'https://api.vooster.ai/v1',
    apiToken: process.env.VOOSTER_API_TOKEN || '',
    watchDir: process.env.SYNC_WATCH_DIR || '.vooster/tasks',
    dbPath: process.env.SYNC_DB_PATH || '.vooster/sync.db',
    pollIntervalMs: parseInt(process.env.SYNC_POLL_INTERVAL_MS || '30000', 10),
    concurrency: parseInt(process.env.SYNC_CONCURRENCY || '5', 10),
    deletePolicy:
      (process.env.SYNC_DELETE_POLICY as DeletePolicy) || DeletePolicy.ARCHIVE,
    clockDriftMs: parseInt(process.env.SYNC_CLOCK_DRIFT_MS || '5000', 10),
    enabled: process.env.SYNC_ENABLED === 'true',
    retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.SYNC_RETRY_DELAY_MS || '1000', 10),
    maxRetryDelayMs: parseInt(
      process.env.SYNC_MAX_RETRY_DELAY_MS || '32000',
      10
    ),
  };

  // 설정 검증
  const validated = SyncConfigSchema.parse(config);

  return validated;
}

/**
 * 절대 경로로 변환
 */
export function resolveAbsolutePath(relativePath: string, rootDir?: string): string {
  const root = rootDir || process.cwd();
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(root, relativePath);
}

/**
 * 설정 검증
 */
export function validateConfig(config: SyncConfig): void {
  if (!config.apiToken || config.apiToken === 'your-vooster-api-token') {
    throw new Error(
      'VOOSTER_API_TOKEN이 설정되지 않았습니다. .env 파일을 확인하세요.'
    );
  }

  if (!config.baseURL) {
    throw new Error('VOOSTER_BASE_URL이 설정되지 않았습니다.');
  }

  if (config.pollIntervalMs < 1000) {
    throw new Error('SYNC_POLL_INTERVAL_MS는 최소 1000ms 이상이어야 합니다.');
  }

  if (config.concurrency < 1 || config.concurrency > 20) {
    throw new Error('SYNC_CONCURRENCY는 1~20 사이여야 합니다.');
  }
}

/**
 * 설정 마스킹 (로깅용)
 */
export function maskConfig(config: SyncConfig): Partial<SyncConfig> {
  return {
    ...config,
    apiToken: config.apiToken
      ? `${config.apiToken.substring(0, 8)}...`
      : '<not set>',
  };
}
