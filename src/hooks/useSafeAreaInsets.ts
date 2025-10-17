/**
 * useSafeAreaInsets Hook
 *
 * iOS/Android 디바이스의 Safe Area Inset 값을 감지합니다.
 * - 노치 (Notch): iPhone 12/13/14/15 등
 * - 동적 아일랜드 (Dynamic Island): iPhone 14 Pro/15 Pro
 * - 홈 인디케이터: 대부분의 Android 기기
 * - 상태 바/네비게이션 바
 *
 * CSS env(safe-area-inset-*) 환경 변수를 사용합니다.
 * https://www.w3.org/TR/css-env-1/
 *
 * @returns {Object} Safe Area 값 (top, right, bottom, left)
 */

'use client';

import { useState, useEffect } from 'react';

export interface SafeAreaInsets {
  /** 상단 Safe Area (노치, 상태바 등) */
  top: number;
  /** 우측 Safe Area */
  right: number;
  /** 하단 Safe Area (홈 인디케이터 등) */
  bottom: number;
  /** 좌측 Safe Area */
  left: number;
  /** 실제 환경 변수 지원 여부 */
  isSupported: boolean;
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
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    isSupported: false,
    style: {},
  });

  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window === 'undefined') return;

    // 임시 요소로 환경 변수 읽기
    const tempEl = document.createElement('div');
    tempEl.style.position = 'fixed';
    tempEl.style.padding = 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    tempEl.style.visibility = 'hidden';
    tempEl.style.pointerEvents = 'none';
    document.body.appendChild(tempEl);

    // 계산된 스타일에서 padding 값 추출
    const computedStyle = window.getComputedStyle(tempEl);
    const paddingTop = parseInsetValue(computedStyle.paddingTop);
    const paddingRight = parseInsetValue(computedStyle.paddingRight);
    const paddingBottom = parseInsetValue(computedStyle.paddingBottom);
    const paddingLeft = parseInsetValue(computedStyle.paddingLeft);

    // 환경 변수 지원 여부 판별
    // (모든 값이 0이 아니거나 viewport-fit=cover일 때 지원하는 것으로 봄)
    const isSupported =
      paddingTop > 0 ||
      paddingRight > 0 ||
      paddingBottom > 0 ||
      paddingLeft > 0;

    const newInsets: SafeAreaInsets = {
      top: paddingTop,
      right: paddingRight,
      bottom: paddingBottom,
      left: paddingLeft,
      isSupported,
      style: {
        '--safe-area-inset-top': `${paddingTop}px`,
        '--safe-area-inset-right': `${paddingRight}px`,
        '--safe-area-inset-bottom': `${paddingBottom}px`,
        '--safe-area-inset-left': `${paddingLeft}px`,
      } as React.CSSProperties & {
        '--safe-area-inset-top': string;
        '--safe-area-inset-right': string;
        '--safe-area-inset-bottom': string;
        '--safe-area-inset-left': string;
      },
    };

    setInsets(newInsets);

    // 정리
    document.body.removeChild(tempEl);

    // 화면 방향 변경 시 재계산
    const handleOrientationChange = () => {
      // 약간의 지연을 줌 (렌더링 완료 대기)
      setTimeout(() => {
        const tempEl2 = document.createElement('div');
        tempEl2.style.position = 'fixed';
        tempEl2.style.padding = 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
        tempEl2.style.visibility = 'hidden';
        tempEl2.style.pointerEvents = 'none';
        document.body.appendChild(tempEl2);

        const computedStyle2 = window.getComputedStyle(tempEl2);
        const paddingTop2 = parseInsetValue(computedStyle2.paddingTop);
        const paddingRight2 = parseInsetValue(computedStyle2.paddingRight);
        const paddingBottom2 = parseInsetValue(computedStyle2.paddingBottom);
        const paddingLeft2 = parseInsetValue(computedStyle2.paddingLeft);

        setInsets({
          top: paddingTop2,
          right: paddingRight2,
          bottom: paddingBottom2,
          left: paddingLeft2,
          isSupported,
          style: {
            '--safe-area-inset-top': `${paddingTop2}px`,
            '--safe-area-inset-right': `${paddingRight2}px`,
            '--safe-area-inset-bottom': `${paddingBottom2}px`,
            '--safe-area-inset-left': `${paddingLeft2}px`,
          } as React.CSSProperties & {
            '--safe-area-inset-top': string;
            '--safe-area-inset-right': string;
            '--safe-area-inset-bottom': string;
            '--safe-area-inset-left': string;
          },
        });

        document.body.removeChild(tempEl2);
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return insets;
}
