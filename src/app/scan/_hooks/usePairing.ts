/**
 * 페어링 로직 Hook
 *
 * QR 스캔 후 POST /api/pair/approve 호출하여 페어링을 완료합니다
 *
 * @example
 * const { approve, isLoading, error } = usePairing();
 * const result = await approve(
 *   { sessionId: '...', code: '123456' },
 *   'device-id',
 *   'org-001',
 *   'cutting'
 * );
 */

'use client';

import { useState, useCallback } from 'react';
import type { PairingApprovalRequest, PairingApprovalResponse } from '@/features/remote-display/types';
import { PairingApprovalRequestSchema } from '@/features/remote-display/schemas';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';

interface UsePairingReturn {
  /**
   * 페어링 승인 함수
   *
   * @param qrData - QR 코드에서 추출한 데이터
   * @param deviceId - 디바이스 ID
   * @param orgId - 조직 ID
   * @param lineId - 라인 ID
   * @returns 성공 시 { token, screenId }, 실패 시 null
   */
  approve: (
    qrData: { sessionId: string; code: string },
    deviceId: string,
    orgId: string,
    lineId: string
  ) => Promise<{ token: string; screenId: string } | null>;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 에러 메시지 */
  error: string | null;

  /** 에러 초기화 */
  clearError: () => void;
}

export function usePairing(): UsePairingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 페어링 승인 처리
   */
  const approve = useCallback(
    async (
      qrData: { sessionId: string; code: string },
      deviceId: string,
      orgId: string,
      lineId: string
    ): Promise<{ token: string; screenId: string } | null> => {
      try {
        setIsLoading(true);
        setError(null);

        // Supabase 세션에서 JWT 토큰 가져오기
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error('Supabase 클라이언트를 사용할 수 없습니다.');
        }

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        }

        // 요청 본문 생성 및 검증
        const requestBody: PairingApprovalRequest = {
          sessionId: qrData.sessionId,
          code: qrData.code,
          deviceId,
          orgId,
          lineId,
        };

        // Zod로 요청 데이터 검증
        const validatedRequest = PairingApprovalRequestSchema.parse(
          requestBody
        );

        // API 호출
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/pair/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(validatedRequest),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          const errorMessage =
            data.message ||
            '페어링 실패. 다시 시도해주세요.';
          throw new Error(errorMessage);
        }

        // 성공 응답 타입 캐스팅
        const successData = data as PairingApprovalResponse;

        console.log('✅ 페어링 완료:', {
          screenId: successData.screenId,
          expiresAt: successData.expiresAt,
        });

        return {
          token: successData.token,
          screenId: successData.screenId,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '알 수 없는 에러';
        console.error('❌ 페어링 에러:', errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    approve,
    isLoading,
    error,
    clearError,
  };
}
