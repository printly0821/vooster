/**
 * 충돌 해결 로직
 * @module sync/conflict
 */

import {
  ConflictWinner,
  ConflictContext,
  LocalTask,
  RemoteTask,
} from '../types';
import pino from 'pino';

export interface ConflictResolution {
  winner: ConflictWinner;
  reason: string;
  localTimestamp: number;
  remoteTimestamp: number;
  driftMs: number;
}

/**
 * 충돌 해결기
 */
export class ConflictResolver {
  private logger: pino.Logger;

  constructor(logger?: pino.Logger) {
    this.logger =
      logger ||
      pino({
        name: 'conflict-resolver',
        level: 'info',
      });
  }

  /**
   * 타임스탬프 기반 충돌 해결
   * 최신 수정 시간 우선 정책
   */
  resolve(context: ConflictContext): ConflictResolution {
    const localTime = new Date(context.localTask.updatedAt).getTime();
    const remoteTime = new Date(context.remoteTask.updatedAt).getTime();
    const diff = localTime - remoteTime;

    this.logger.debug(
      {
        localId: context.localTask.id,
        remoteId: context.remoteTask.id,
        localTime: context.localTask.updatedAt,
        remoteTime: context.remoteTask.updatedAt,
        diff,
        clockDrift: context.clockDriftMs,
      },
      '충돌 감지'
    );

    // 허용 드리프트 내 동시 변경: 로컬 우선
    if (Math.abs(diff) <= context.clockDriftMs) {
      return {
        winner: 'local',
        reason: 'clock_drift_tolerance',
        localTimestamp: localTime,
        remoteTimestamp: remoteTime,
        driftMs: Math.abs(diff),
      };
    }

    // 최신 수정 우선
    const winner: ConflictWinner = localTime > remoteTime ? 'local' : 'remote';

    return {
      winner,
      reason: 'latest_timestamp',
      localTimestamp: localTime,
      remoteTimestamp: remoteTime,
      driftMs: Math.abs(diff),
    };
  }

  /**
   * 커스텀 해결 전략 (확장용)
   */
  resolveCustom(
    context: ConflictContext,
    strategy: (local: LocalTask, remote: RemoteTask) => ConflictWinner
  ): ConflictResolution {
    const localTime = new Date(context.localTask.updatedAt).getTime();
    const remoteTime = new Date(context.remoteTask.updatedAt).getTime();

    const winner = strategy(context.localTask, context.remoteTask);

    return {
      winner,
      reason: 'custom_strategy',
      localTimestamp: localTime,
      remoteTimestamp: remoteTime,
      driftMs: Math.abs(localTime - remoteTime),
    };
  }

  /**
   * 충돌 로그 기록
   */
  logConflict(
    context: ConflictContext,
    resolution: ConflictResolution
  ): void {
    this.logger.warn(
      {
        localId: context.localTask.id,
        remoteId: context.remoteTask.id,
        winner: resolution.winner,
        reason: resolution.reason,
        driftMs: resolution.driftMs,
        localTitle: context.localTask.title,
        remoteTitle: context.remoteTask.title,
      },
      '충돌 해결됨'
    );
  }

  /**
   * 충돌 통계 수집 (확장용)
   */
  getStats(): ConflictStats {
    // TODO: 통계 수집 구현
    return {
      total: 0,
      localWins: 0,
      remoteWins: 0,
      skipped: 0,
    };
  }
}

export interface ConflictStats {
  total: number;
  localWins: number;
  remoteWins: number;
  skipped: number;
}

/**
 * 간단한 충돌 해결 함수
 */
export function resolveConflict(
  localUpdatedAt: string,
  remoteUpdatedAt: string,
  clockDriftMs: number
): ConflictWinner {
  const lt = new Date(localUpdatedAt).getTime();
  const rt = new Date(remoteUpdatedAt).getTime();

  if (Math.abs(lt - rt) <= clockDriftMs) {
    return 'local';
  }

  return lt > rt ? 'local' : 'remote';
}
