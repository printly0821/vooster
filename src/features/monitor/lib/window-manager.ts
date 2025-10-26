/**
 * 팝업 창 관리 유틸리티
 */

import type { PopupSettings } from '../types';

/**
 * 기본 팝업 설정
 */
export const DEFAULT_POPUP_SETTINGS: PopupSettings = {
  features:
    'width=1024,height=768,left=0,top=0,scrollbars=yes,resizable=yes,noopener,noreferrer',
  name: 'workorder',
  width: 1024,
  height: 768,
};

/**
 * 팝업 차단 감지
 */
export function isPopupBlocked(popup: Window | null): boolean {
  if (!popup) return true;
  try {
    return popup.closed || popup.outerWidth === 0;
  } catch {
    return true;
  }
}

/**
 * 팝업 열기 또는 기존 창 재사용
 */
export function openOrFocusPopup(
  targetUrl: string,
  settings: PopupSettings = DEFAULT_POPUP_SETTINGS,
  existingPopup?: Window | null
): Window | null {
  // 기존 팝업이 열려있으면 재사용
  if (existingPopup && !isPopupBlocked(existingPopup)) {
    try {
      existingPopup.location.href = targetUrl;
      existingPopup.focus();
      return existingPopup;
    } catch {
      // location.href 변경 실패 시 새 팝업 열기
    }
  }

  // 새 팝업 열기
  const popup = window.open(targetUrl, settings.name, settings.features);

  if (isPopupBlocked(popup)) {
    console.warn('팝업 차단됨. 사용자에게 알림 필요.');
    return null;
  }

  return popup;
}

/**
 * Window Management API 권한 요청
 */
export async function requestWindowPermission(): Promise<boolean> {
  try {
    // Window Management API 확인
    if (!('getScreenDetails' in window)) {
      console.log('Window Management API 미지원');
      return false;
    }

    // @ts-ignore - Window Management API는 타입 정의가 제한적
    const screens = await (window as any).getScreenDetails();

    // 멀티 모니터 정보 추가 확인
    if (screens.screens.length > 1) {
      console.log('멀티 모니터 감지:', screens.screens.length);
    }

    return true;
  } catch (error) {
    console.log('Window Management API 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 멀티 스크린 정보 조회
 */
export async function getScreenDetails(): Promise<
  | {
      screens: Array<{ x: number; y: number; width: number; height: number }>;
      currentScreen: { x: number; y: number; width: number; height: number };
    }
  | null
> {
  try {
    if (!('getScreenDetails' in window)) {
      return null;
    }

    // @ts-ignore
    const details = await (window as any).getScreenDetails();

    return {
      screens: details.screens.map((s: any) => ({
        x: s.left || 0,
        y: s.top || 0,
        width: s.width,
        height: s.height,
      })),
      currentScreen: {
        x: details.currentScreen?.left || 0,
        y: details.currentScreen?.top || 0,
        width: details.currentScreen?.width || window.innerWidth,
        height: details.currentScreen?.height || window.innerHeight,
      },
    };
  } catch {
    return null;
  }
}

/**
 * 팝업을 세컨드 모니터로 이동
 */
export async function movePopupToSecondMonitor(
  popup: Window | null,
  settings: PopupSettings = DEFAULT_POPUP_SETTINGS
): Promise<boolean> {
  if (!popup || isPopupBlocked(popup)) {
    return false;
  }

  try {
    const screenDetails = await getScreenDetails();

    if (!screenDetails || screenDetails.screens.length <= 1) {
      console.log('세컨드 모니터 없음');
      return false;
    }

    // 두 번째 모니터로 이동
    const secondScreen = screenDetails.screens[1];
    if (!secondScreen) {
      return false;
    }

    const x = secondScreen.x;
    const y = secondScreen.y;

    popup.moveTo(x, y);
    popup.resizeTo(secondScreen.width, secondScreen.height);

    return true;
  } catch (error) {
    console.log('팝업 이동 실패:', error);
    return false;
  }
}

/**
 * 사용자 제스처 확인 (click, touch 등)
 */
export function registerUserGestureListener(
  callback: () => void
): () => void {
  const handleGesture = () => {
    callback();
    // 한 번만 실행
    document.removeEventListener('click', handleGesture);
    document.removeEventListener('touchstart', handleGesture);
  };

  document.addEventListener('click', handleGesture);
  document.addEventListener('touchstart', handleGesture);

  return () => {
    document.removeEventListener('click', handleGesture);
    document.removeEventListener('touchstart', handleGesture);
  };
}
