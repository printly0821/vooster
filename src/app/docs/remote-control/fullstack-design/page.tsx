/**
 * 원격 제어 시스템 - 풀스택 설계 페이지
 *
 * Next.js 15를 기반으로 한 풀스택 아키텍처를 상세히 설명합니다.
 * 프론트엔드, 백엔드, 클라이언트 에이전트, 배포 전략을 다룹니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/fullstack-design');
}

export default function RemoteControlFullstackDesignPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/fullstack-design" />
    </Suspense>
  );
}
