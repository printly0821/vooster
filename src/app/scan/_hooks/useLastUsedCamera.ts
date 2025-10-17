import { useEffect, useState } from 'react';

const LAST_CAMERA_ID_KEY = 'vooster:lastCameraId';
const REMEMBER_LAST_CAMERA_KEY = 'vooster:rememberLastCamera';

/**
 * 마지막 사용한 카메라를 기억하는 Hook
 * - LocalStorage에 deviceId 저장
 * - 앱 시작 시 자동으로 마지막 카메라 선택
 * - 카메라 없을 시 기본값 반환
 */
export function useLastUsedCamera() {
  const [lastCameraId, setLastCameraId] = useState<string | null>(null);
  const [rememberCamera, setRememberCamera] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // 초기 로드: LocalStorage에서 값 읽기
  useEffect(() => {
    try {
      const savedCameraId = localStorage.getItem(LAST_CAMERA_ID_KEY);
      const shouldRemember = localStorage.getItem(REMEMBER_LAST_CAMERA_KEY);

      setLastCameraId(savedCameraId);
      setRememberCamera(shouldRemember !== 'false'); // 기본값 true
      setIsLoaded(true);
    } catch (error) {
      console.warn('Failed to load camera settings from localStorage:', error);
      setIsLoaded(true);
    }
  }, []);

  /**
   * 마지막 사용 카메라 저장
   */
  const saveLastCamera = (deviceId: string) => {
    try {
      localStorage.setItem(LAST_CAMERA_ID_KEY, deviceId);
      setLastCameraId(deviceId);
    } catch (error) {
      console.warn('Failed to save camera ID to localStorage:', error);
    }
  };

  /**
   * 마지막 카메라 기억 설정 토글
   */
  const toggleRememberCamera = (remember: boolean) => {
    try {
      localStorage.setItem(REMEMBER_LAST_CAMERA_KEY, String(remember));
      setRememberCamera(remember);

      // 기억 해제 시 저장된 ID 제거
      if (!remember) {
        localStorage.removeItem(LAST_CAMERA_ID_KEY);
        setLastCameraId(null);
      }
    } catch (error) {
      console.warn('Failed to save camera preference to localStorage:', error);
    }
  };

  /**
   * 저장된 카메라 ID 초기화
   */
  const clearLastCamera = () => {
    try {
      localStorage.removeItem(LAST_CAMERA_ID_KEY);
      setLastCameraId(null);
    } catch (error) {
      console.warn('Failed to clear camera ID from localStorage:', error);
    }
  };

  return {
    lastCameraId,
    rememberCamera,
    isLoaded,
    saveLastCamera,
    toggleRememberCamera,
    clearLastCamera,
  };
}
