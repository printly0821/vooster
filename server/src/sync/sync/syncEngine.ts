/**
 * 동기화 엔진 핵심 로직
 * @module sync/sync
 */

import chokidar, { FSWatcher } from 'chokidar';
import PQueue from 'p-queue';
import pino from 'pino';
import * as path from 'path';

import {
  SyncConfig,
  FileChangeEvent,
  SyncResult,
  SyncOperation,
  SyncDirection,
  DeletePolicy,
  SyncStats,
  HealthStatus,
  LocalTask,
  RemoteTask,
} from '../types';
import { MappingStore } from '../store/mappingStore';
import { VoosterClient } from '../api/voosterClient';
import {
  parseTaskFile,
  writeTaskFile,
  toRemotePayload,
  fromRemotePayload,
  pathFromTitle,
} from '../parser/taskParser';
import { resolveConflict } from '../conflict/conflictResolver';
import { resolveAbsolutePath } from '../config/config';

export class SyncEngine {
  private config: SyncConfig;
  private store: MappingStore;
  private api: VoosterClient;
  private queue: PQueue;
  private watcher: FSWatcher | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private logger: pino.Logger;
  private stats: Partial<SyncStats> = {
    created: 0,
    updated: 0,
    deleted: 0,
    conflicts: 0,
    errors: 0,
    skipped: 0,
  };

  constructor(
    config: SyncConfig,
    store: MappingStore,
    api: VoosterClient,
    logger?: pino.Logger
  ) {
    this.config = config;
    this.store = store;
    this.api = api;
    this.logger =
      logger ||
      pino({
        name: 'sync-engine',
        level: 'info',
      });

    this.queue = new PQueue({
      concurrency: config.concurrency,
    });
  }

  /**
   * 동기화 엔진 시작
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('동기화가 비활성화되어 있습니다 (SYNC_ENABLED=false)');
      return;
    }

    this.logger.info(
      {
        watchDir: this.config.watchDir,
        pollInterval: this.config.pollIntervalMs,
        concurrency: this.config.concurrency,
      },
      '동기화 엔진 시작'
    );

    // 초기 동기화
    await this.initialSync();

    // 파일 워처 시작
    this.startWatcher();

    // 폴링 루프 시작
    this.startPolling();
  }

  /**
   * 동기화 엔진 중지
   */
  async stop(): Promise<void> {
    this.logger.info('동기화 엔진 중지 중...');

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    await this.queue.onIdle();
    this.logger.info('동기화 엔진 중지 완료');
  }

  /**
   * 초기 동기화
   */
  private async initialSync(): Promise<void> {
    this.logger.info('초기 동기화 시작');

    try {
      // 원격→로컬 동기화
      await this.syncRemoteToLocal();

      this.logger.info('초기 동기화 완료');
    } catch (error) {
      this.logger.error({ error }, '초기 동기화 실패');
      throw error;
    }
  }

  /**
   * 파일 워처 시작
   */
  private startWatcher(): void {
    const watchDir = resolveAbsolutePath(this.config.watchDir);

    this.watcher = chokidar.watch(watchDir, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
      ignored: /(^|[\/\\])\../, // .으로 시작하는 파일 무시
    });

    this.watcher.on('add', (filePath) => this.enqueue('create', filePath));
    this.watcher.on('change', (filePath) => this.enqueue('update', filePath));
    this.watcher.on('unlink', (filePath) => this.enqueue('delete', filePath));

    this.logger.info({ watchDir }, '파일 워처 시작됨');
  }

  /**
   * 폴링 루프 시작
   */
  private startPolling(): void {
    this.pollInterval = setInterval(async () => {
      try {
        await this.syncRemoteToLocal();
      } catch (error) {
        this.logger.error({ error }, '폴링 동기화 실패');
      }
    }, this.config.pollIntervalMs);

    this.logger.info(
      { intervalMs: this.config.pollIntervalMs },
      '폴링 루프 시작됨'
    );
  }

  /**
   * 파일 변경 이벤트 큐에 추가
   */
  private enqueue(kind: 'create' | 'update' | 'delete', filePath: string): void {
    const event: FileChangeEvent = {
      kind,
      path: filePath,
      timestamp: new Date().toISOString(),
    };

    this.queue.add(() => this.processLocalChange(event));
  }

  /**
   * 로컬 변경 처리 (로컬→원격)
   */
  private async processLocalChange(event: FileChangeEvent): Promise<SyncResult> {
    const startTime = Date.now();
    this.logger.debug({ event }, '로컬 변경 처리 시작');

    try {
      // 파일 삭제 처리
      if (event.kind === 'delete') {
        return await this.handleLocalDelete(event.path);
      }

      // 파일 생성/수정 처리
      const task = await parseTaskFile(event.path);
      const mapping = this.store.get(task.id);

      // 원격 태스크 조회
      const remoteTask = mapping?.remoteId
        ? await this.api.getTask(mapping.remoteId)
        : await this.api.findByExternalId(task.id);

      if (!remoteTask) {
        // 새로운 태스크 생성
        return await this.createRemoteTask(task, event.path);
      }

      // 기존 태스크 업데이트 (충돌 해결 포함)
      return await this.updateRemoteTask(task, remoteTask, event.path);
    } catch (error) {
      this.stats.errors = (this.stats.errors || 0) + 1;
      this.logger.error({ event, error }, '로컬 변경 처리 실패');

      return {
        operation: SyncOperation.SKIP,
        direction: SyncDirection.LOCAL_TO_REMOTE,
        filePath: event.path,
        success: false,
        error: error as Error,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 로컬 파일 삭제 처리
   */
  private async handleLocalDelete(filePath: string): Promise<SyncResult> {
    const startTime = Date.now();
    const localId = await this.store.getLocalIdByPath(filePath);

    if (!localId) {
      return {
        operation: SyncOperation.SKIP,
        direction: SyncDirection.LOCAL_TO_REMOTE,
        filePath,
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    const mapping = this.store.get(localId);
    if (!mapping?.remoteId) {
      this.store.remove(localId);
      return {
        operation: SyncOperation.DELETE,
        direction: SyncDirection.LOCAL_TO_REMOTE,
        localId,
        filePath,
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    // 삭제 정책 적용
    await this.applyDeletePolicy(mapping.remoteId, this.config.deletePolicy);
    this.store.remove(localId);
    this.stats.deleted = (this.stats.deleted || 0) + 1;

    return {
      operation: SyncOperation.DELETE,
      direction: SyncDirection.LOCAL_TO_REMOTE,
      localId,
      remoteId: mapping.remoteId,
      filePath,
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 원격 태스크 생성
   */
  private async createRemoteTask(task: LocalTask, filePath: string): Promise<SyncResult> {
    const startTime = Date.now();

    const created = await this.api.createTask(toRemotePayload(task) as any, {
      idempotencyKey: task.id,
    });

    this.store.upsert({
      localId: task.id,
      filePath,
      remoteId: created.id,
      etag: created.etag,
      lastLocalUpdatedAt: task.updatedAt,
      lastRemoteUpdatedAt: created.updatedAt,
    });

    this.stats.created = (this.stats.created || 0) + 1;
    this.logger.info({ localId: task.id, remoteId: created.id }, '원격 태스크 생성됨');

    return {
      operation: SyncOperation.CREATE,
      direction: SyncDirection.LOCAL_TO_REMOTE,
      localId: task.id,
      remoteId: created.id,
      filePath,
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 원격 태스크 업데이트
   */
  private async updateRemoteTask(
    localTask: LocalTask,
    remoteTask: RemoteTask,
    filePath: string
  ): Promise<SyncResult> {
    const startTime = Date.now();

    // 충돌 해결
    const winner = resolveConflict(
      localTask.updatedAt,
      remoteTask.updatedAt,
      this.config.clockDriftMs
    );

    if (winner === 'remote') {
      // 원격이 최신: 로컬 덮어쓰기
      await writeTaskFile(filePath, fromRemotePayload(remoteTask));
      this.store.touchRemote(
        localTask.id,
        localTask.updatedAt,
        remoteTask.updatedAt,
        remoteTask.etag
      );

      this.stats.conflicts = (this.stats.conflicts || 0) + 1;
      this.logger.info({ localId: localTask.id }, '원격 우선 (로컬 덮어쓰기)');

      return {
        operation: SyncOperation.UPDATE,
        direction: SyncDirection.REMOTE_TO_LOCAL,
        localId: localTask.id,
        remoteId: remoteTask.id,
        filePath,
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    // 로컬이 최신: 원격 업데이트
    const updated = await this.api.updateTask(remoteTask.id, toRemotePayload(localTask) as any, {
      ifMatch: remoteTask.etag,
    });

    this.store.touchLocal(
      localTask.id,
      localTask.updatedAt,
      updated.updatedAt,
      updated.etag
    );

    this.stats.updated = (this.stats.updated || 0) + 1;
    this.logger.info({ localId: localTask.id, remoteId: updated.id }, '원격 태스크 업데이트됨');

    return {
      operation: SyncOperation.UPDATE,
      direction: SyncDirection.LOCAL_TO_REMOTE,
      localId: localTask.id,
      remoteId: updated.id,
      filePath,
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 원격→로컬 동기화
   */
  private async syncRemoteToLocal(): Promise<void> {
    const since = await this.store.getMaxRemoteUpdatedAt();
    const changed = await this.api.listUpdatedSince(since);

    if (changed.length === 0) {
      return;
    }

    this.logger.debug({ count: changed.length, since }, '원격 변경 감지');

    for (const remoteTask of changed) {
      try {
        const mapping = this.store.getByRemoteId(remoteTask.id);
        const filePath = mapping?.filePath || path.join(
          resolveAbsolutePath(this.config.watchDir),
          pathFromTitle(remoteTask.title)
        );

        await writeTaskFile(filePath, fromRemotePayload(remoteTask));
        this.store.linkOrUpdate(remoteTask, filePath);

        this.logger.debug(
          { remoteId: remoteTask.id, filePath },
          '원격→로컬 동기화 완료'
        );
      } catch (error) {
        this.logger.error(
          { remoteId: remoteTask.id, error },
          '원격→로컬 동기화 실패'
        );
      }
    }
  }

  /**
   * 삭제 정책 적용
   */
  async applyDeletePolicy(remoteId: string, policy: DeletePolicy): Promise<void> {
    switch (policy) {
      case DeletePolicy.DELETE:
        await this.api.deleteTask(remoteId);
        this.logger.info({ remoteId }, '원격 태스크 삭제됨');
        break;
      case DeletePolicy.ARCHIVE:
        await this.api.archiveTask(remoteId);
        this.logger.info({ remoteId }, '원격 태스크 보관됨');
        break;
      case DeletePolicy.IGNORE:
        this.logger.info({ remoteId }, '원격 태스크 삭제 무시됨');
        break;
    }
  }

  /**
   * 헬스체크
   */
  getHealth(): HealthStatus {
    return {
      healthy: true,
      lastSyncAt: new Date().toISOString(),
      lastErrorAt: null,
      pendingOperations: this.queue.size + this.queue.pending,
      stats: this.stats,
    };
  }

  /**
   * 통계 조회
   */
  getStats(): Partial<SyncStats> {
    return { ...this.stats };
  }
}
