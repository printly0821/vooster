/**
 * 원격 제어 시스템 - 프론트엔드 WebSocket 페이지
 *
 * React에서 WebSocket을 활용한 실시간 상태 관리를 설명합니다.
 * Zustand, React Query 통합, 성능 최적화, UI 패턴을 다룹니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/frontend-websocket');
}

export default function RemoteControlFrontendWebsocketPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/frontend-websocket" />
    </Suspense>
  );
}
