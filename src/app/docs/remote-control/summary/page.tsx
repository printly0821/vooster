/**
 * 원격 제어 시스템 - 빠른 요약 페이지
 *
 * 5분 만에 원격 제어 시스템의 핵심을 이해할 수 있도록
 * 아키텍처, 기술 선택, 타입 안전성을 간단하게 설명합니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/summary');
}

export default function RemoteControlSummaryPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/summary" />
    </Suspense>
  );
}
