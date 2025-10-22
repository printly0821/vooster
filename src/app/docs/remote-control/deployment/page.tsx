/**
 * 원격 제어 시스템 - 배포 및 운영 가이드 페이지
 *
 * 프로덕션 배포, 모니터링, 로깅, 문제 해결을 다룹니다.
 * Docker, Vercel, 클라우드 배포, 운영 절차를 설명합니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/deployment');
}

export default function RemoteControlDeploymentPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/deployment" />
    </Suspense>
  );
}
