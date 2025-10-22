/**
 * 원격 제어 시스템 - 프로젝트 README 페이지
 *
 * 프로젝트 개요, 빠른 시작 가이드, 기술 스택, 주요 기능을 설명합니다.
 * 신규 팀원을 위한 온보딩 문서입니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/readme');
}

export default function RemoteControlReadmePage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/readme" />
    </Suspense>
  );
}
