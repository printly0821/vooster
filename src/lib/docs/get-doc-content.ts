import { cache } from 'react';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { markdownToHtml, extractToc, type TocItem } from './markdown';

export interface DocMetadata {
  title: string;
  description?: string;
  category: string;
  author?: string;
  date?: string;
  public: boolean;
  order?: number;
}

export interface DocContent {
  readonly metadata: Readonly<DocMetadata>;
  readonly content: string;
  readonly html: string;
  readonly toc: ReadonlyArray<TocItem>;
  readonly slug: string;
}

/**
 * 문서 파일 경로 매핑
 * key: 슬러그, value: 프로젝트 루트로부터의 상대 경로
 */
const DOC_PATHS: Record<string, string> = {
  // 기존 문서
  'barcode-guide': 'docs/web-barcode-scanning-guide.md',
  'prd': 'vooster-docs/prd.md',
  'architecture': 'vooster-docs/architecture.md',
  'guideline': 'vooster-docs/guideline.md',
  'design-guide': 'vooster-docs/design-guide.md',
  'ia': 'vooster-docs/ia.md',
  'step-by-step': 'vooster-docs/step-by-step.md',
  'clean-code': 'vooster-docs/clean-code.md',
  'field-analysis': 'vooster-docs/field-requirements-analysis.md',

  // 원격 제어 시스템 문서
  // 개요 및 시작
  'remote-control/index': 'vooster-docs/TYPESCRIPT_REMOTE_CONTROL_INDEX.md',
  'remote-control/summary': 'vooster-docs/REMOTE_CONTROL_SUMMARY.md',
  'remote-control/readme': 'vooster-docs/REMOTE-CONTROL-README.md',
  'remote-control/fullstack-summary': 'vooster-docs/FULLSTACK-STRATEGY-SUMMARY.md',

  // 기술 설계 - TypeScript/아키텍처
  'remote-control/rpc-comparison': 'vooster-docs/rpc-solutions-comparison.md',
  'remote-control/architecture': 'vooster-docs/remote-control-architecture.md',
  'remote-control/implementation': 'vooster-docs/remote-control-implementation.md',

  // 기술 설계 - 분산 제어
  'remote-control/distributed-architecture': 'vooster-docs/distributed-control-system-architecture.md',
  'remote-control/distributed-implementation': 'vooster-docs/distributed-control-implementation-guide.md',
  'remote-control/distributed-quick-start': 'vooster-docs/distributed-control-quick-start.md',

  // 기술 설계 - 프론트엔드
  'remote-control/frontend-websocket': 'vooster-docs/frontend-remote-control-websocket.md',

  // 풀스택 및 배포
  'remote-control/fullstack-design': 'vooster-docs/remote-control-fullstack.md',
  'remote-control/fullstack-implementation': 'vooster-docs/implementation-guide.md',
  'remote-control/deployment': 'vooster-docs/deployment-guide.md',
};

/**
 * 문서 슬러그로 파일 경로 가져오기
 */
function getDocPath(slug: string): string {
  const relativePath = DOC_PATHS[slug];
  if (!relativePath) {
    throw new Error(`Document not found: ${slug}`);
  }

  const projectRoot = process.cwd();
  return path.join(projectRoot, relativePath);
}

/**
 * 문서 컨텐츠 가져오기 (서버 컴포넌트에서 사용)
 * React Cache로 래핑하여 generateMetadata()와 페이지 렌더링 간 중복 실행 방지
 */
export const getDocContent = cache(async (slug: string): Promise<DocContent> => {
  try {
    const filePath = getDocPath(slug);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // frontmatter 파싱
    const { data, content } = matter(fileContent);

    // 기본 메타데이터 설정
    const metadata: DocMetadata = {
      title: data.title || '제목 없음',
      description: data.description,
      category: data.category || 'general',
      author: data.author,
      date: data.date,
      public: data.public ?? false,
      order: data.order,
    };

    // Markdown → HTML 변환
    const html = await markdownToHtml(content);

    // 목차 추출
    const toc = extractToc(content);

    return {
      metadata,
      content,
      html,
      toc,
      slug,
    };
  } catch (error) {
    console.error(`Error reading document ${slug}:`, error);
    throw new Error(`Failed to load document: ${slug}`);
  }
});

/**
 * 모든 문서 목록 가져오기
 */
export function getAllDocs(): Array<{
  slug: string;
  title: string;
  category: string;
  public: boolean;
  order: number;
}> {
  return Object.entries(DOC_PATHS).map(([slug, relativePath]) => {
    const filePath = path.join(process.cwd(), relativePath);

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);

      return {
        slug,
        title: data.title || slug,
        category: data.category || 'general',
        public: data.public ?? false,
        order: data.order ?? 999,
      };
    } catch (error) {
      console.error(`Error reading ${slug}:`, error);
      return {
        slug,
        title: slug,
        category: 'general',
        public: false,
        order: 999,
      };
    }
  });
}

/**
 * 카테고리별로 문서 그룹핑
 */
export function getDocsByCategory() {
  const docs = getAllDocs();
  const grouped: Record<string, typeof docs> = {};

  for (const doc of docs) {
    if (!grouped[doc.category]) {
      grouped[doc.category] = [];
    }
    grouped[doc.category]?.push(doc);
  }

  // 각 카테고리 내에서 order로 정렬
  for (const category in grouped) {
    grouped[category]?.sort((a, b) => a.order - b.order);
  }

  return grouped;
}
