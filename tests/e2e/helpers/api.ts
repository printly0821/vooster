/**
 * E2E 테스트용 API 클라이언트
 *
 * Socket.IO 서버 REST API를 호출하는 유틸리티입니다.
 */

import { generateDisplayToken, generateApproverToken } from './auth';

/**
 * API 베이스 URL
 */
const API_BASE_URL = 'http://localhost:3001';

/**
 * 트리거 API 호출
 *
 * @param screenId - 화면 ID
 * @param jobNo - 작업 번호
 * @returns 트리거 응답
 *
 * @example
 * const response = await triggerDisplay('screen:e2e:test', 'JOB-12345');
 * expect(response.ok).toBe(true);
 */
export async function triggerDisplay(screenId: string, jobNo: string): Promise<any> {
  const token = generateDisplayToken(screenId);

  const response = await fetch(`${API_BASE_URL}/api/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      screenId,
      jobNo,
    }),
  });

  if (!response.ok) {
    throw new Error(`Trigger failed: ${response.status}`);
  }

  return response.json();
}

/**
 * 페어링 승인 API 호출
 *
 * @param sessionId - 페어링 세션 ID
 * @param code - 페어링 코드 (6자리)
 * @param deviceId - 디바이스 ID
 * @returns 승인 응답
 *
 * @example
 * const response = await approvePairing('session-uuid', '123456', 'device-001');
 * expect(response.ok).toBe(true);
 */
export async function approvePairing(
  sessionId: string,
  code: string,
  deviceId: string
): Promise<any> {
  const token = generateApproverToken();

  const response = await fetch(`${API_BASE_URL}/api/pair/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      sessionId,
      code,
      deviceId,
      orgId: 'e2e-org',
      lineId: 'e2e-line',
    }),
  });

  if (!response.ok) {
    throw new Error(`Pairing approval failed: ${response.status}`);
  }

  return response.json();
}

/**
 * 테스트 데이터 리셋 API 호출
 *
 * 서버의 메모리 DB 및 Redis 캐시를 초기화합니다.
 *
 * @example
 * await resetTestData();
 */
export async function resetTestData(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/test/reset`, {
    method: 'POST',
  });

  if (!response.ok) {
    console.warn('⚠️  Test reset failed (서버에 /api/test/reset 미구현 가능)');
  }
}
