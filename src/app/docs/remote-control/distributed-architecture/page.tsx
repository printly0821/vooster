/**
 * 원격 제어 시스템 - 분산 제어 아키텍처 페이지
 *
 * 여러 원격 컴퓨터를 제어하기 위한 분산 아키텍처를 설명합니다.
 * 시스템 구조, 데이터 흐름, 기술 선택, 보안 전략을 다룹니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/distributed-architecture');
}

export default function RemoteControlDistributedArchitecturePage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/distributed-architecture" />
    </Suspense>
  );
}
