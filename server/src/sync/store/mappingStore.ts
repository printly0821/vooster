/**
 * SQLite 기반 로컬-원격 태스크 매핑 스토어
 * @module sync/store
 */

import Database from 'better-sqlite3';
import { MappingRecord, DeletePolicy } from '../types';
import * as path from 'path';
import * as fs from 'fs';

export class MappingStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    // DB 디렉터리가 없으면 생성
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.initializeSchema();
  }

  /**
   * 스키마 초기화
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mappings (
        localId TEXT PRIMARY KEY,
        filePath TEXT NOT NULL UNIQUE,
        remoteId TEXT,
        etag TEXT,
        remoteVersion INTEGER,
        lastSyncedAt TEXT NOT NULL,
        lastLocalUpdatedAt TEXT NOT NULL,
        lastRemoteUpdatedAt TEXT,
        deletionPolicy TEXT NOT NULL DEFAULT 'archive',
        createdAt TEXT NOT NULL,
        syncCount INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_remoteId ON mappings(remoteId);
      CREATE INDEX IF NOT EXISTS idx_filePath ON mappings(filePath);
      CREATE INDEX IF NOT EXISTS idx_lastSyncedAt ON mappings(lastSyncedAt);
    `);
  }

  /**
   * 매핑 레코드 조회 (localId 기준)
   */
  get(localId: string): MappingRecord | null {
    const stmt = this.db.prepare('SELECT * FROM mappings WHERE localId = ?');
    const row = stmt.get(localId) as MappingRecord | undefined;
    return row || null;
  }

  /**
   * 매핑 레코드 조회 (remoteId 기준)
   */
  getByRemoteId(remoteId: string): MappingRecord | null {
    const stmt = this.db.prepare('SELECT * FROM mappings WHERE remoteId = ?');
    const row = stmt.get(remoteId) as MappingRecord | undefined;
    return row || null;
  }

  /**
   * 매핑 레코드 조회 (filePath 기준)
   */
  getByFilePath(filePath: string): MappingRecord | null {
    const stmt = this.db.prepare('SELECT * FROM mappings WHERE filePath = ?');
    const row = stmt.get(filePath) as MappingRecord | undefined;
    return row || null;
  }

  /**
   * localId 조회 (filePath 기준)
   */
  async getLocalIdByPath(filePath: string): Promise<string | null> {
    const mapping = this.getByFilePath(filePath);
    return mapping?.localId || null;
  }

  /**
   * 매핑 레코드 생성 또는 업데이트
   */
  upsert(record: Partial<MappingRecord> & { localId: string; filePath: string }): void {
    const now = new Date().toISOString();
    const existing = this.get(record.localId);

    if (existing) {
      // UPDATE
      const stmt = this.db.prepare(`
        UPDATE mappings
        SET filePath = ?,
            remoteId = ?,
            etag = ?,
            remoteVersion = ?,
            lastSyncedAt = ?,
            lastLocalUpdatedAt = ?,
            lastRemoteUpdatedAt = ?,
            deletionPolicy = ?,
            syncCount = syncCount + 1
        WHERE localId = ?
      `);

      stmt.run(
        record.filePath,
        record.remoteId || existing.remoteId,
        record.etag || existing.etag,
        record.remoteVersion ?? existing.remoteVersion,
        now,
        record.lastLocalUpdatedAt || existing.lastLocalUpdatedAt,
        record.lastRemoteUpdatedAt || existing.lastRemoteUpdatedAt,
        record.deletionPolicy || existing.deletionPolicy,
        record.localId
      );
    } else {
      // INSERT
      const stmt = this.db.prepare(`
        INSERT INTO mappings (
          localId, filePath, remoteId, etag, remoteVersion,
          lastSyncedAt, lastLocalUpdatedAt, lastRemoteUpdatedAt,
          deletionPolicy, createdAt, syncCount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      stmt.run(
        record.localId,
        record.filePath,
        record.remoteId || null,
        record.etag || null,
        record.remoteVersion ?? null,
        now,
        record.lastLocalUpdatedAt || now,
        record.lastRemoteUpdatedAt || null,
        record.deletionPolicy || DeletePolicy.ARCHIVE,
        record.createdAt || now
      );
    }
  }

  /**
   * 로컬 업데이트 시간 갱신
   */
  touchLocal(
    localId: string,
    lastLocalUpdatedAt: string,
    lastRemoteUpdatedAt?: string,
    etag?: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE mappings
      SET lastLocalUpdatedAt = ?,
          lastRemoteUpdatedAt = ?,
          etag = ?,
          lastSyncedAt = ?
      WHERE localId = ?
    `);

    const now = new Date().toISOString();
    stmt.run(
      lastLocalUpdatedAt,
      lastRemoteUpdatedAt || null,
      etag || null,
      now,
      localId
    );
  }

  /**
   * 원격 업데이트 시간 갱신
   */
  touchRemote(
    localId: string,
    lastLocalUpdatedAt: string,
    lastRemoteUpdatedAt: string,
    etag?: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE mappings
      SET lastRemoteUpdatedAt = ?,
          lastLocalUpdatedAt = ?,
          etag = ?,
          lastSyncedAt = ?
      WHERE localId = ?
    `);

    const now = new Date().toISOString();
    stmt.run(lastRemoteUpdatedAt, lastLocalUpdatedAt, etag || null, now, localId);
  }

  /**
   * remoteId 연결/업데이트
   */
  linkOrUpdate(remoteTask: { id: string; updatedAt: string; etag?: string }, filePath: string): void {
    const existing = this.getByRemoteId(remoteTask.id);
    const now = new Date().toISOString();

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE mappings
        SET lastRemoteUpdatedAt = ?,
            etag = ?,
            lastSyncedAt = ?
        WHERE remoteId = ?
      `);
      stmt.run(remoteTask.updatedAt, remoteTask.etag || null, now, remoteTask.id);
    } else {
      // 새로운 원격 태스크
      const localId = path.basename(filePath, path.extname(filePath));
      this.upsert({
        localId,
        filePath,
        remoteId: remoteTask.id,
        etag: remoteTask.etag,
        lastLocalUpdatedAt: now,
        lastRemoteUpdatedAt: remoteTask.updatedAt,
      });
    }
  }

  /**
   * 매핑 레코드 삭제
   */
  remove(localId: string): void {
    const stmt = this.db.prepare('DELETE FROM mappings WHERE localId = ?');
    stmt.run(localId);
  }

  /**
   * 가장 최근 원격 업데이트 시간 조회 (폴링 기준선)
   */
  async getMaxRemoteUpdatedAt(): Promise<string | null> {
    const stmt = this.db.prepare(`
      SELECT MAX(lastRemoteUpdatedAt) as maxDate
      FROM mappings
      WHERE lastRemoteUpdatedAt IS NOT NULL
    `);
    const row = stmt.get() as { maxDate: string | null } | undefined;
    return row?.maxDate || null;
  }

  /**
   * 모든 매핑 레코드 조회
   */
  getAll(): MappingRecord[] {
    const stmt = this.db.prepare('SELECT * FROM mappings ORDER BY lastSyncedAt DESC');
    return stmt.all() as MappingRecord[];
  }

  /**
   * 매핑 개수 조회
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM mappings');
    const row = stmt.get() as { count: number };
    return row.count;
  }

  /**
   * 데이터베이스 닫기
   */
  close(): void {
    this.db.close();
  }

  /**
   * 트랜잭션 실행
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}
