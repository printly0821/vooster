/**
 * 디스플레이 목록 조회 Hook
 *
 * GET /api/displays 호출하여 온라인 디스플레이 목록을 가져옵니다
 *
 * @example
 * const { displays, isLoading, error, refetch } = useDisplays({
 *   lineId: 'cutting',
 *   onlineOnly: true
 * });
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Display } from '@/features/remote-display/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';

interface UseDisplaysOptions {
  /** 라인 ID로 필터링 */
  lineId?: string;

  /** 온라인만 조회 */
  onlineOnly?: boolean;
}

interface UseDisplaysReturn {
  /** 디스플레이 목록 */
  displays: Display[];

  /** 로딩 상태 */
  isLoading: boolean;

  /** 에러 메시지 */
  error: string | null;

  /** 재조회 함수 */
  refetch: () => void;
}

export function useDisplays(options: UseDisplaysOptions = {}): UseDisplaysReturn {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 디스플레이 목록 조회
   */
  const fetchDisplays = useCallback(async () => {
    try {
      // 기존 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      // Supabase 세션에서 JWT 토큰 가져오기
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      // 쿼리 파라미터 생성
      const params = new URLSearchParams();
      if (options.lineId) {
        params.set('lineId', options.lineId);
      }
      if (options.onlineOnly !== undefined) {
        params.set('onlineOnly', String(options.onlineOnly));
      }

      // API 호출 (JWT 토큰 필요)
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(
        `${apiUrl}/api/displays?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('인증 토큰이 만료되었습니다. 다시 로그인해주세요.');
        }
        throw new Error('디스플레이 목록 조회 실패');
      }

      const data = await response.json();

      if (data.ok && Array.isArray(data.displays)) {
        // lastSeen을 Date 객체로 변환
        const displaysWithDatetime = data.displays.map(
          (display: Display) => ({
            ...display,
            lastSeen: display.lastSeen,
          })
        );
        setDisplays(displaysWithDatetime);
      } else {
        throw new Error(data.message || '응답 형식 오류');
      }
    } catch (err) {
      // AbortController로 인한 취소는 에러로 처리하지 않음
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('디스플레이 조회 에러:', err);
        setError(err.message || '알 수 없는 에러');
      }
    } finally {
      setIsLoading(false);
    }
  }, [options.lineId, options.onlineOnly]);

  // 초기 로드 및 의존성 변경 시 재조회
  useEffect(() => {
    fetchDisplays();

    // cleanup: 컴포넌트 언마운트 시 pending 요청 취소
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDisplays]);

  return {
    displays,
    isLoading,
    error,
    refetch: fetchDisplays,
  };
}
