/**
 * 원격 제어 시스템 - TypeScript 설계 INDEX 페이지
 *
 * 모든 원격 제어 시스템 문서의 색인 및 네비게이션 가이드를 제공합니다.
 * 전체 문서 구조, 읽는 순서, 학습 경로를 설명합니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/index');
}

export default function RemoteControlIndexPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/index" />
    </Suspense>
  );
}
