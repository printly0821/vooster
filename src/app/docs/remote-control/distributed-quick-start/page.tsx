/**
 * 원격 제어 시스템 - 빠른 시작 가이드 페이지
 *
 * 분산 제어 시스템을 5분 안에 이해할 수 있는 빠른 시작 가이드입니다.
 * 핵심 개념, 최소 설정, 빠른 예제를 제공합니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/distributed-quick-start');
}

export default function RemoteControlDistributedQuickStartPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/distributed-quick-start" />
    </Suspense>
  );
}
