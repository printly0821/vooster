/**
 * Vooster 동기화 엔진 타입 정의
 * @module sync/types
 */

import { z } from 'zod';

/**
 * 태스크 상태
 */
export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * 태스크 우선순위
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * 삭제 정책
 */
export enum DeletePolicy {
  ARCHIVE = 'archive',
  DELETE = 'delete',
  IGNORE = 'ignore',
}

/**
 * 동기화 방향
 */
export enum SyncDirection {
  LOCAL_TO_REMOTE = 'local_to_remote',
  REMOTE_TO_LOCAL = 'remote_to_local',
}

/**
 * 동기화 작업 종류
 */
export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SKIP = 'skip',
}

/**
 * 로컬 태스크 파일 스키마 (Zod)
 */
export const LocalTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export type LocalTask = z.infer<typeof LocalTaskSchema>;

/**
 * 원격 태스크 스키마 (Vooster API)
 */
export const RemoteTaskSchema = z.object({
  id: z.string(),
  externalId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  updatedAt: z.string(),
  createdAt: z.string(),
  etag: z.string().optional(),
  version: z.number().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type RemoteTask = z.infer<typeof RemoteTaskSchema>;

/**
 * 매핑 레코드 (로컬-원격 연결)
 */
export interface MappingRecord {
  localId: string;
  filePath: string;
  remoteId: string | null;
  etag: string | null;
  remoteVersion: number | null;
  lastSyncedAt: string;
  lastLocalUpdatedAt: string;
  lastRemoteUpdatedAt: string | null;
  deletionPolicy: DeletePolicy;
  createdAt: string;
  syncCount: number;
}

/**
 * 동기화 설정
 */
export interface SyncConfig {
  baseURL: string;
  apiToken: string;
  watchDir: string;
  dbPath: string;
  pollIntervalMs: number;
  concurrency: number;
  deletePolicy: DeletePolicy;
  clockDriftMs: number;
  enabled: boolean;
  retryAttempts?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
}

/**
 * 동기화 설정 스키마 (Zod)
 */
export const SyncConfigSchema = z.object({
  baseURL: z.string().url(),
  apiToken: z.string().min(1),
  watchDir: z.string().min(1),
  dbPath: z.string().min(1),
  pollIntervalMs: z.number().min(1000).max(600000),
  concurrency: z.number().min(1).max(20),
  deletePolicy: z.nativeEnum(DeletePolicy),
  clockDriftMs: z.number().min(0).max(60000),
  enabled: z.boolean(),
  retryAttempts: z.number().min(0).max(10).optional().default(3),
  retryDelayMs: z.number().min(100).max(10000).optional().default(1000),
  maxRetryDelayMs: z.number().min(1000).max(60000).optional().default(32000),
});

/**
 * 파일 변경 이벤트
 */
export interface FileChangeEvent {
  kind: 'create' | 'update' | 'delete';
  path: string;
  timestamp: string;
}

/**
 * 동기화 결과
 */
export interface SyncResult {
  operation: SyncOperation;
  direction: SyncDirection;
  localId?: string;
  remoteId?: string;
  filePath?: string;
  success: boolean;
  error?: Error;
  timestamp: string;
  durationMs?: number;
}

/**
 * 충돌 해결 결과
 */
export type ConflictWinner = 'local' | 'remote' | 'skip';

/**
 * 충돌 컨텍스트
 */
export interface ConflictContext {
  localTask: LocalTask;
  remoteTask: RemoteTask;
  mapping: MappingRecord;
  clockDriftMs: number;
}

/**
 * API 에러 응답
 */
export interface APIErrorResponse {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * 동기화 통계
 */
export interface SyncStats {
  totalSynced: number;
  created: number;
  updated: number;
  deleted: number;
  conflicts: number;
  errors: number;
  skipped: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

/**
 * 헬스체크 상태
 */
export interface HealthStatus {
  healthy: boolean;
  lastSyncAt: string | null;
  lastErrorAt: string | null;
  pendingOperations: number;
  stats: Partial<SyncStats>;
}

/**
 * 파일 포맷
 */
export enum FileFormat {
  JSON = 'json',
  MARKDOWN = 'md',
}

/**
 * Markdown 프론트매터
 */
export interface MarkdownFrontmatter {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  updatedAt: string;
  createdAt?: string;
  tags?: string[];
  [key: string]: unknown;
}
