/**
 * 원격 제어 시스템 - 분산 제어 구현 가이드 페이지
 *
 * 분산 제어 시스템의 7단계 구현 가이드를 제공합니다.
 * 실제 프로젝트 초기화부터 배포까지 모든 단계를 다룹니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/distributed-implementation');
}

export default function RemoteControlDistributedImplementationPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/distributed-implementation" />
    </Suspense>
  );
}
