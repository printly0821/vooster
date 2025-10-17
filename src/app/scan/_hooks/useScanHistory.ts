/**
 * useScanHistory Hook
 *
 * 바코드 스캔 내역을 LocalStorage에 저장하고 관리하는 Hook
 * - 최대 20개까지 저장
 * - 중복 제거 (최신 것으로 업데이트)
 * - 시간 순 정렬 (최신순)
 * - 검색, 삭제 기능
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScanHistoryItem } from '../_types/settings';

const STORAGE_KEY = 'scan-history';
const MAX_HISTORY_ITEMS = 20;

export function useScanHistory(maxItems = MAX_HISTORY_ITEMS) {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // LocalStorage에서 히스토리 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ScanHistoryItem[];
        // 최신순 정렬 및 개수 제한
        const sorted = parsed
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, maxItems);
        setHistory(sorted);
      }
    } catch (error) {
      console.error('히스토리 로드 실패:', error);
      setHistory([]);
    } finally {
      setIsLoaded(true);
    }
  }, [maxItems]);

  /**
   * 히스토리에 항목 추가
   * 중복 제거 및 최신순 유지
   */
  const addToHistory = useCallback(
    (item: ScanHistoryItem) => {
      try {
        setHistory((prev) => {
          // 기존 항목 제거 (중복 방지)
          const filtered = prev.filter((h) => h.barcode !== item.barcode);

          // 새 항목 추가 (최상단)
          const newHistory = [item, ...filtered].slice(0, maxItems);

          // LocalStorage 저장
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));

          return newHistory;
        });
      } catch (error) {
        console.error('히스토리 추가 실패:', error);
      }
    },
    [maxItems]
  );

  /**
   * 전체 히스토리 삭제
   */
  const clearHistory = useCallback(() => {
    try {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('히스토리 삭제 실패:', error);
    }
  }, []);

  /**
   * 개별 항목 삭제
   */
  const removeItem = useCallback((barcode: string) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.barcode !== barcode);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return filtered;
      });
    } catch (error) {
      console.error('히스토리 항목 삭제 실패:', error);
    }
  }, []);

  /**
   * 검색 필터 (바코드 또는 품목명)
   */
  const searchHistory = useCallback(
    (query: string) => {
      if (!query.trim()) return history;

      const lowerQuery = query.toLowerCase();
      return history.filter(
        (item) =>
          item.barcode.toLowerCase().includes(lowerQuery) ||
          item.itemName?.toLowerCase().includes(lowerQuery)
      );
    },
    [history]
  );

  /**
   * 상대 시간 포맷 (예: "방금 전", "5분 전", "1시간 전")
   */
  const getRelativeTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 10) return '방금 전';
    if (seconds < 60) return `${seconds}초 전`;
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    removeItem,
    searchHistory,
    getRelativeTime,
    isLoaded,
  };
}
