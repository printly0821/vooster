/**
 * useScannerSettings Hook
 *
 * 스캐너 설정을 LocalStorage에 저장하고 관리하는 Hook
 * - 카메라 설정 (플래시, 자동초점)
 * - 스캔 설정 (쿨다운, 타임아웃)
 * - 피드백 설정 (진동, 소리)
 * - 기타 설정 (카메라 기억)
 */

'use client';

import { useState, useEffect } from 'react';
import { ScannerSettings, DEFAULT_SCANNER_SETTINGS } from '../_types/settings';

const STORAGE_KEY = 'scanner-settings';

export function useScannerSettings() {
  const [settings, setSettings] = useState<ScannerSettings>(DEFAULT_SCANNER_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // LocalStorage에서 설정 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ScannerSettings;
        // 기본 설정과 병합 (새로운 설정 항목 대응)
        setSettings({ ...DEFAULT_SCANNER_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
      // 에러 시 기본 설정 사용
      setSettings(DEFAULT_SCANNER_SETTINGS);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  /**
   * 설정 저장
   */
  const saveSettings = (newSettings: ScannerSettings) => {
    try {
      setSettings(newSettings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }
  };

  /**
   * 개별 설정 업데이트
   */
  const updateSetting = <K extends keyof ScannerSettings>(
    key: K,
    value: ScannerSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  /**
   * 설정 초기화
   */
  const resetSettings = () => {
    saveSettings(DEFAULT_SCANNER_SETTINGS);
  };

  return {
    settings,
    saveSettings,
    updateSetting,
    resetSettings,
    isLoaded,
  };
}
