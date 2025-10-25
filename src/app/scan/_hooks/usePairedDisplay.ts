/**
 * 페어링 상태 관리 Hook
 *
 * localStorage에 저장된 pairedScreenId를 관리합니다
 *
 * @example
 * const { pairedScreenId, save, disconnect } = usePairedDisplay();
 *
 * // 페어링 정보 저장
 * save('screen:org-001:cutting', 'jwt-token-here');
 *
 * // 연결 끊기
 * disconnect();
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '@/features/remote-display/types';

interface UsePairedDisplayReturn {
  /** 현재 페어링된 screenId */
  pairedScreenId: string | null;

  /** 페어링된 디스플레이 이름 */
  displayName: string | null;

  /**
   * 페어링 정보 저장
   *
   * @param screenId - 화면 ID
   * @param token - 페어링 토큰
   * @param displayName - 디스플레이 이름
   */
  save: (screenId: string, token: string, displayName?: string) => void;

  /**
   * 페어링 정보 삭제 (연결 끊기)
   */
  disconnect: () => void;

  /**
   * 페어링 토큰 가져오기
   */
  getToken: () => string | null;
}

export function usePairedDisplay(): UsePairedDisplayReturn {
  const [pairedScreenId, setPairedScreenId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  /**
   * 클라이언트 사이드에서만 localStorage 접근 가능
   */
  useEffect(() => {
    setIsClient(true);

    // LocalStorage에서 페어링 정보 로드
    try {
      const storedScreenId = localStorage.getItem(STORAGE_KEYS.PAIRED_SCREEN_ID);
      const storedDisplayData = localStorage.getItem(
        STORAGE_KEYS.PAIRED_DISPLAY_DATA
      );

      setPairedScreenId(storedScreenId);

      if (storedDisplayData) {
        try {
          const data = JSON.parse(storedDisplayData);
          setDisplayName(data.displayName);
        } catch {
          // JSON 파싱 실패, 무시
        }
      }
    } catch (error) {
      console.error('페어링 정보 로드 실패:', error);
    }
  }, []);

  /**
   * 페어링 정보 저장
   */
  const save = useCallback(
    (screenId: string, token: string, name?: string) => {
      if (!isClient) return;

      try {
        localStorage.setItem(STORAGE_KEYS.PAIRED_SCREEN_ID, screenId);
        localStorage.setItem(STORAGE_KEYS.PAIRING_TOKEN, token);

        // 추가 정보 저장
        if (name) {
          const displayData = {
            screenId,
            displayName: name,
            pairedAt: new Date().toISOString(),
          };
          localStorage.setItem(
            STORAGE_KEYS.PAIRED_DISPLAY_DATA,
            JSON.stringify(displayData)
          );
        }

        setPairedScreenId(screenId);
        setDisplayName(name || null);

        console.log('✅ 페어링 정보 저장:', screenId);
      } catch (error) {
        console.error('❌ 페어링 정보 저장 실패:', error);
      }
    },
    [isClient]
  );

  /**
   * 페어링 정보 삭제
   */
  const disconnect = useCallback(() => {
    if (!isClient) return;

    try {
      localStorage.removeItem(STORAGE_KEYS.PAIRED_SCREEN_ID);
      localStorage.removeItem(STORAGE_KEYS.PAIRING_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.PAIRED_DISPLAY_DATA);

      setPairedScreenId(null);
      setDisplayName(null);

      console.log('✅ 페어링 정보 삭제');
    } catch (error) {
      console.error('❌ 페어링 정보 삭제 실패:', error);
    }
  }, [isClient]);

  /**
   * 페어링 토큰 가져오기
   */
  const getToken = useCallback(() => {
    if (!isClient) return null;

    try {
      return localStorage.getItem(STORAGE_KEYS.PAIRING_TOKEN);
    } catch {
      return null;
    }
  }, [isClient]);

  return {
    pairedScreenId,
    displayName,
    save,
    disconnect,
    getToken,
  };
}
