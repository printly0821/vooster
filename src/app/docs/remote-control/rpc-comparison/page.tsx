/**
 * 원격 제어 시스템 - RPC 솔루션 비교분석 페이지
 *
 * gRPC, tRPC, JSON-RPC 세 가지 RPC 솔루션을 상세히 비교분석합니다.
 * 각 솔루션의 장단점, 코드 예제, 성능 비교를 제공합니다.
 */

import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('remote-control/rpc-comparison');
}

export default function RemoteControlRpcComparisonPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DocPage slug="remote-control/rpc-comparison" />
    </Suspense>
  );
}
