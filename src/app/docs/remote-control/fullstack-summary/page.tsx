/**
 * 원격 제어 시스템 - 풀스택 전략 요약 페이지
 *
 * Next.js 기반 풀스택 구현 전략의 통합 요약을 제공합니다.
 * 기술 스택 선택, 개발 순서, 주요 결정사항을 설명합니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/fullstack-summary');
}

export default function RemoteControlFullstackSummaryPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/fullstack-summary" />
    </Suspense>
  );
}
