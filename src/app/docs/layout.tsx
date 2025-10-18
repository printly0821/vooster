import { type ReactNode } from 'react';
import DocLayout from '@/components/docs/DocLayout';

/**
 * 문서 레이아웃 - 서버 컴포넌트
 * 클라이언트 컴포넌트인 DocLayout을 래핑합니다.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocLayout>{children}</DocLayout>;
}
