/**
 * 원격 제어 시스템 - 풀스택 구현 가이드 페이지
 *
 * 개발자를 위한 실제 구현 핸드북입니다.
 * Next.js 프로젝트 초기화, Supabase 연동, API 구현, WebSocket 설정을 다룹니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/fullstack-implementation');
}

export default function RemoteControlFullstackImplementationPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/fullstack-implementation" />
    </Suspense>
  );
}
