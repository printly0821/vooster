/**
 * 태스크 파일 파서 (JSON/Markdown)
 * @module sync/parser
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import {
  LocalTask,
  LocalTaskSchema,
  RemoteTask,
  FileFormat,
  MarkdownFrontmatter,
  TaskStatus,
  TaskPriority,
} from '../types';

/**
 * 파일 포맷 감지
 */
export function detectFileFormat(filePath: string): FileFormat {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.markdown') {
    return FileFormat.MARKDOWN;
  }
  if (ext === '.json') {
    return FileFormat.JSON;
  }
  throw new Error(`지원하지 않는 파일 형식: ${ext}`);
}

/**
 * 태스크 파일 파싱
 */
export async function parseTaskFile(filePath: string): Promise<LocalTask> {
  const format = detectFileFormat(filePath);
  const content = await fs.readFile(filePath, 'utf-8');

  if (format === FileFormat.JSON) {
    return parseJSON(content);
  } else {
    return parseMarkdown(content);
  }
}

/**
 * JSON 파싱
 */
function parseJSON(content: string): LocalTask {
  try {
    const data = JSON.parse(content);
    return LocalTaskSchema.parse(data);
  } catch (error) {
    throw new Error(`JSON 파싱 오류: ${(error as Error).message}`);
  }
}

/**
 * Markdown 파싱 (Frontmatter)
 */
function parseMarkdown(content: string): LocalTask {
  try {
    const { data, content: body } = matter(content);

    const task: LocalTask = {
      id: data.id || '',
      title: data.title || '',
      description: body.trim() || data.description || '',
      status: data.status || TaskStatus.BACKLOG,
      priority: data.priority || TaskPriority.MEDIUM,
      updatedAt: data.updatedAt || new Date().toISOString(),
      createdAt: data.createdAt,
      tags: data.tags || [],
      metadata: data.metadata,
    };

    return LocalTaskSchema.parse(task);
  } catch (error) {
    throw new Error(`Markdown 파싱 오류: ${(error as Error).message}`);
  }
}

/**
 * 태스크를 파일로 저장
 */
export async function writeTaskFile(
  filePath: string,
  task: LocalTask
): Promise<void> {
  const format = detectFileFormat(filePath);

  // 디렉터리가 없으면 생성
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  if (format === FileFormat.JSON) {
    const content = JSON.stringify(task, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  } else {
    const content = serializeMarkdown(task);
    await fs.writeFile(filePath, content, 'utf-8');
  }
}

/**
 * Markdown 직렬화
 */
function serializeMarkdown(task: LocalTask): string {
  const frontmatter: MarkdownFrontmatter = {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    updatedAt: task.updatedAt,
    createdAt: task.createdAt,
    tags: task.tags,
  };

  if (task.metadata) {
    Object.assign(frontmatter, task.metadata);
  }

  const md = matter.stringify(task.description, frontmatter);
  return md;
}

/**
 * LocalTask를 RemoteTask 페이로드로 변환
 */
export function toRemotePayload(task: LocalTask): Partial<RemoteTask> {
  return {
    externalId: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    updatedAt: task.updatedAt,
    createdAt: task.createdAt,
    tags: task.tags,
    metadata: task.metadata,
  };
}

/**
 * RemoteTask를 LocalTask로 변환
 */
export function fromRemotePayload(remoteTask: RemoteTask): LocalTask {
  return {
    id: remoteTask.externalId || remoteTask.id,
    title: remoteTask.title,
    description: remoteTask.description,
    status: (remoteTask.status as TaskStatus) || TaskStatus.BACKLOG,
    priority: (remoteTask.priority as TaskPriority) || TaskPriority.MEDIUM,
    updatedAt: remoteTask.updatedAt,
    createdAt: remoteTask.createdAt,
    tags: remoteTask.tags || [],
    metadata: remoteTask.metadata,
  };
}

/**
 * 파일명에서 제목 생성
 */
export function pathFromTitle(title: string, format: FileFormat = FileFormat.MARKDOWN): string {
  const sanitized = title
    .replace(/[^a-zA-Z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  const ext = format === FileFormat.JSON ? 'json' : 'md';
  return `${sanitized}.${ext}`;
}

/**
 * 파일 존재 확인
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 파일 삭제
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // 파일이 없으면 무시
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * 디렉터리 내 모든 태스크 파일 조회
 */
export async function listTaskFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .filter((entry) => {
        const ext = path.extname(entry.name).toLowerCase();
        return ext === '.json' || ext === '.md' || ext === '.markdown';
      })
      .map((entry) => path.join(dir, entry.name));

    return files;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
