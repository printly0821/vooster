import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';

// refractor 경량화: 필요한 언어만 선택적 로드
import { refractor } from 'refractor/lib/core.js';
import typescript from 'refractor/lang/typescript.js';
import javascript from 'refractor/lang/javascript.js';
import bash from 'refractor/lang/bash.js';
import jsx from 'refractor/lang/jsx.js';
import tsx from 'refractor/lang/tsx.js';
import json from 'refractor/lang/json.js';
import rehypePrism from 'rehype-prism-plus/generator';

// 언어 등록 (모듈 로드 시 1회만 실행)
refractor.register(typescript);
refractor.register(javascript);
refractor.register(bash);
refractor.register(jsx);
refractor.register(tsx);
refractor.register(json);

/**
 * Markdown을 HTML로 변환
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse) // Markdown 파싱
    .use(remarkGfm) // GitHub Flavored Markdown (표, 체크박스 등)
    .use(remarkRehype, { allowDangerousHtml: true }) // Markdown → HTML AST
    .use(rehypeSlug) // 헤딩에 id 자동 추가
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: {
        className: ['anchor-link'],
      },
    }) // 헤딩에 링크 추가
    .use(rehypePrism(refractor), {
      ignoreMissing: true,
      showLineNumbers: true,
    }) // 코드 블록 syntax highlighting (경량화된 refractor 사용)
    .use(rehypeStringify, { allowDangerousHtml: true }) // HTML 문자열로 변환
    .process(markdown);

  return String(result);
}

/**
 * Markdown에서 목차(Table of Contents) 추출
 */
export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export function extractToc(markdown: string): TocItem[] {
  const toc: TocItem[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    // H2, H3만 추출 (# → H1은 제목이므로 제외)
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h2Match?.[1]) {
      const title = h2Match[1].trim();
      const id = slugify(title);
      toc.push({ id, title, level: 2 });
    } else if (h3Match?.[1]) {
      const title = h3Match[1].trim();
      const id = slugify(title);
      toc.push({ id, title, level: 3 });
    }
  }

  return toc;
}

/**
 * 문자열을 slug로 변환 (rehype-slug와 동일한 로직)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-') // 공백 → -
    .replace(/[^\w가-힣-]/g, '') // 영문, 숫자, 한글, - 만 유지
    .replace(/--+/g, '-') // 중복 - 제거
    .replace(/^-|-$/g, ''); // 앞뒤 - 제거
}
