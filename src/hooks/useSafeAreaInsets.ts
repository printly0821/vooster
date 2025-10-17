/**
 * useSafeAreaInsets Hook
 *
 * iOS/Android 디바이스의 Safe Area Inset 값을 감지합니다.
 * - iOS: CSS env(safe-area-inset-*) 환경 변수 사용
 * - Android: CSS 폴백 + JavaScript 계산
 *
 * 노치/커트아웃:
 * - 노치 (Notch): iPhone 12/13/14/15 등
 * - 동적 아일랜드 (Dynamic Island): iPhone 14 Pro/15 Pro
 * - 홈 인디케이터: Android 기기
 * - 상태 바/네비게이션 바
 *
 * CSS env(safe-area-inset-*) 환경 변수를 기본으로 사용하고,
 * Android에서 값이 0인 경우 JavaScript 폴백을 사용합니다.
 * https://www.w3.org/TR/css-env-1/
 * https://developer.chrome.com/docs/css-ui/edge-to-edge
 *
 * @returns {Object} Safe Area 값 (top, right, bottom, left)
 */

'use client';

import { useState, useEffect } from 'react';
import {
  useAndroidDetection,
  getAndroidStatusBarHeight,
  getAndroidNavigationBarHeight,
  getAndroidBottomInsetFromViewport,
} from './useAndroidDetection';

export interface SafeAreaInsets {
  /** 상단 Safe Area (노치, 상태바 등) */
  top: number;
  /** 우측 Safe Area */
  right: number;
  /** 하단 Safe Area (홈 인디케이터 등) */
  bottom: number;
  /** 좌측 Safe Area */
  left: number;
  /** CSS env() 환경 변수 지원 여부 */
  isSupported: boolean;
  /** 계산 방식 ('css-env' | 'android-fallback' | 'viewport-api') */
  calculationMethod: 'css-env' | 'android-fallback' | 'viewport-api';
  /** CSS 변수 스타일 */
  style: React.CSSProperties;
}

/**
 * Safe Area 값 파싱
 * "123px" -> 123
 */
function parseInsetValue(value: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Safe Area Inset 감지 훅
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  const androidInfo = useAndroidDetection();

  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    isSupported: false,
    calculationMethod: 'css-env',
    style: {},
  });

  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window === 'undefined') return;

    // CSS env() 값 먼저 시도
    const tryGetCSSInsets = (): { top: number; right: number; bottom: number; left: number; isValid: boolean } => {
      const tempEl = document.createElement('div');
      tempEl.style.position = 'fixed';
      tempEl.style.padding = 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      tempEl.style.visibility = 'hidden';
      tempEl.style.pointerEvents = 'none';
      document.body.appendChild(tempEl);

      const computedStyle = window.getComputedStyle(tempEl);
      const paddingTop = parseInsetValue(computedStyle.paddingTop);
      const paddingRight = parseInsetValue(computedStyle.paddingRight);
      const paddingBottom = parseInsetValue(computedStyle.paddingBottom);
      const paddingLeft = parseInsetValue(computedStyle.paddingLeft);

      document.body.removeChild(tempEl);

      // env()가 제대로 작동했는지 판별
      // iOS는 값이 있을 수 있고, Android는 0일 수 있음
      const isValid = paddingTop > 0 || paddingRight > 0 || paddingBottom > 0 || paddingLeft > 0;

      return { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft, isValid };
    };

    // Android 폴백 계산
    const getAndroidFallbackInsets = (): { top: number; right: number; bottom: number; left: number; method: 'viewport-api' | 'android-fallback' } => {
      let top = 0;
      let bottom = 0;

      // StatusBar 높이
      top = getAndroidStatusBarHeight(androidInfo.devicePixelRatio);

      // NavigationBar 높이
      // 1. Visual Viewport API 우선
      const viewportBottom = getAndroidBottomInsetFromViewport();
      if (viewportBottom > 0) {
        bottom = viewportBottom;
        return { top, right: 0, bottom, left: 0, method: 'viewport-api' };
      }

      // 2. 휴리스틱 기반
      bottom = getAndroidNavigationBarHeight(androidInfo.hasGestureNav, androidInfo.devicePixelRatio);

      return { top, right: 0, bottom, left: 0, method: 'android-fallback' };
    };

    // 메인 로직
    let cssInsets = tryGetCSSInsets();

    let finalInsets: SafeAreaInsets;
    let calculationMethod: SafeAreaInsets['calculationMethod'] = 'css-env';

    // Android이고 CSS 값이 0이면 폴백
    if (androidInfo.isAndroid && !cssInsets.isValid) {
      const androidFallback = getAndroidFallbackInsets();
      finalInsets = {
        top: androidFallback.top,
        right: androidFallback.right,
        bottom: androidFallback.bottom,
        left: androidFallback.left,
        isSupported: true,
        calculationMethod: androidFallback.method,
        style: {
          '--safe-area-inset-top': `${androidFallback.top}px`,
          '--safe-area-inset-right': `${androidFallback.right}px`,
          '--safe-area-inset-bottom': `${androidFallback.bottom}px`,
          '--safe-area-inset-left': `${androidFallback.left}px`,
        } as React.CSSProperties & {
          '--safe-area-inset-top': string;
          '--safe-area-inset-right': string;
          '--safe-area-inset-bottom': string;
          '--safe-area-inset-left': string;
        },
      };
      calculationMethod = androidFallback.method;
    } else {
      // iOS 또는 CSS가 유효한 경우
      finalInsets = {
        top: cssInsets.top,
        right: cssInsets.right,
        bottom: cssInsets.bottom,
        left: cssInsets.left,
        isSupported: cssInsets.isValid,
        calculationMethod: 'css-env',
        style: {
          '--safe-area-inset-top': `${cssInsets.top}px`,
          '--safe-area-inset-right': `${cssInsets.right}px`,
          '--safe-area-inset-bottom': `${cssInsets.bottom}px`,
          '--safe-area-inset-left': `${cssInsets.left}px`,
        } as React.CSSProperties & {
          '--safe-area-inset-top': string;
          '--safe-area-inset-right': string;
          '--safe-area-inset-bottom': string;
          '--safe-area-inset-left': string;
        },
      };
    }

    setInsets(finalInsets);

    // 화면 방향 변경 또는 리사이즈 시 재계산
    const recalculateInsets = () => {
      setTimeout(() => {
        let newCSSInsets = tryGetCSSInsets();

        let newFinalInsets: SafeAreaInsets;

        if (androidInfo.isAndroid && !newCSSInsets.isValid) {
          const androidFallback = getAndroidFallbackInsets();
          newFinalInsets = {
            top: androidFallback.top,
            right: androidFallback.right,
            bottom: androidFallback.bottom,
            left: androidFallback.left,
            isSupported: true,
            calculationMethod: androidFallback.method,
            style: {
              '--safe-area-inset-top': `${androidFallback.top}px`,
              '--safe-area-inset-right': `${androidFallback.right}px`,
              '--safe-area-inset-bottom': `${androidFallback.bottom}px`,
              '--safe-area-inset-left': `${androidFallback.left}px`,
            } as React.CSSProperties & {
              '--safe-area-inset-top': string;
              '--safe-area-inset-right': string;
              '--safe-area-inset-bottom': string;
              '--safe-area-inset-left': string;
            },
          };
        } else {
          newFinalInsets = {
            top: newCSSInsets.top,
            right: newCSSInsets.right,
            bottom: newCSSInsets.bottom,
            left: newCSSInsets.left,
            isSupported: newCSSInsets.isValid,
            calculationMethod: 'css-env',
            style: {
              '--safe-area-inset-top': `${newCSSInsets.top}px`,
              '--safe-area-inset-right': `${newCSSInsets.right}px`,
              '--safe-area-inset-bottom': `${newCSSInsets.bottom}px`,
              '--safe-area-inset-left': `${newCSSInsets.left}px`,
            } as React.CSSProperties & {
              '--safe-area-inset-top': string;
              '--safe-area-inset-right': string;
              '--safe-area-inset-bottom': string;
              '--safe-area-inset-left': string;
            },
          };
        }

        setInsets(newFinalInsets);
      }, 100);
    };

    // 이벤트 리스너 등록
    window.addEventListener('orientationchange', recalculateInsets);
    window.addEventListener('resize', recalculateInsets);

    // Visual Viewport API 모니터링 (Android용)
    let visualViewportListener: (() => void) | null = null;
    if ('visualViewport' in window) {
      visualViewportListener = () => {
        recalculateInsets();
      };
      window.visualViewport?.addEventListener('resize', visualViewportListener);
    }

    return () => {
      window.removeEventListener('orientationchange', recalculateInsets);
      window.removeEventListener('resize', recalculateInsets);
      if (visualViewportListener && 'visualViewport' in window) {
        window.visualViewport?.removeEventListener('resize', visualViewportListener);
      }
    };
  }, [androidInfo]);

  return insets;
}
