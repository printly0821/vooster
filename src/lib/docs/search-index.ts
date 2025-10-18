import { getAllDocs } from './get-doc-content';
import Fuse from 'fuse.js';

export interface SearchResult {
  slug: string;
  title: string;
  category: string;
  score: number;
}

/**
 * 검색 인덱스 생성 및 검색
 */
export function createSearchIndex() {
  const docs = getAllDocs();

  const fuse = new Fuse(docs, {
    keys: ['title', 'category'],
    threshold: 0.3,
    includeScore: true,
  });

  return fuse;
}

/**
 * 문서 검색
 */
export function searchDocs(query: string): SearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const fuse = createSearchIndex();
  const results = fuse.search(query);

  return results.map((result) => ({
    slug: result.item.slug,
    title: result.item.title,
    category: result.item.category,
    score: result.score || 0,
  }));
}
