/**
 * 원격 제어 시스템 - TypeScript 구현 가이드 페이지
 *
 * TypeScript 기반 원격 제어 시스템의 단계별 구현 가이드를 제공합니다.
 * Phase 1부터 6까지 구체적인 코드 예제와 함께 설명합니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/implementation');
}

export default function RemoteControlImplementationPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/implementation" />
    </Suspense>
  );
}
