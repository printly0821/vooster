/**
 * 원격 제어 시스템 - TypeScript 아키텍처 페이지
 *
 * TypeScript 타입 시스템을 활용한 원격 제어 아키텍처를 설명합니다.
 * 타입 안전한 구현 방법, 조건부 타입, 에러 처리 전략을 다룹니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/architecture');
}

export default function RemoteControlArchitecturePage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/architecture" />
    </Suspense>
  );
}
