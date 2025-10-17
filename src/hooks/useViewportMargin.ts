/**
 * useViewportMargin Hook
 *
 * 뷰포트 크기 기반으로 이미지 뷰어의 적응형 마진을 계산합니다.
 * - 모바일(< 768px): 4%
 * - 태블릿(768-1024px): 6%
 * - 데스크톱(> 1024px): 8%
 *
 * @returns {Object} 마진 값 및 CSS 변수
 */

'use client';

import { useState, useEffect } from 'react';

export interface ViewportMargin {
  /** 계산된 마진 값 (픽셀) */
  marginPx: number;
  /** 뷰포트 너비 */
  viewportWidth: number;
  /** 뷰포트 높이 */
  viewportHeight: number;
  /** 디바이스 타입 */
  deviceType: 'mobile' | 'tablet' | 'desktop';
  /** 마진 비율 (%) */
  marginPercentage: number;
  /** 이미지 컨테이너 최대 높이 (헤더 제외) */
  maxImageHeight: number;
  /** CSS 변수 스타일 */
  style: React.CSSProperties;
}

/**
 * 디바이스 타입 판별
 */
function getDeviceType(
  width: number
): 'mobile' | 'tablet' | 'desktop' {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * 마진 비율 계산
 */
function getMarginPercentage(
  deviceType: 'mobile' | 'tablet' | 'desktop'
): number {
  switch (deviceType) {
    case 'mobile':
      return 4;
    case 'tablet':
      return 6;
    case 'desktop':
      return 8;
  }
}

/**
 * 뷰포트 마진 계산 훅
 */
export function useViewportMargin(): ViewportMargin {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // 초기 로드 및 리사이즈 감지
  useEffect(() => {
    // 초기값 설정
    if (typeof window !== 'undefined') {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    }

    // 리사이즈 핸들러
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 계산
  const deviceType = getDeviceType(viewportWidth);
  const marginPercentage = getMarginPercentage(deviceType);
  const marginPx = Math.max(
    Math.round((viewportWidth * marginPercentage) / 100),
    12 // 최소 마진 12px
  );

  // 헤더 높이 (모바일: 64px, 데스크톱: 72px)
  const headerHeight = viewportWidth < 768 ? 64 : 72;

  // 이미지 컨테이너 최대 높이 (전체 높이 - 헤더 - 마진)
  const maxImageHeight = Math.max(
    viewportHeight - headerHeight - marginPx * 2,
    200 // 최소 높이 200px
  );

  // CSS 변수 스타일
  const style: React.CSSProperties = {
    '--viewport-margin': `${marginPx}px`,
    '--viewport-margin-percent': `${marginPercentage}%`,
    '--max-image-height': `${maxImageHeight}px`,
    '--header-height': `${headerHeight}px`,
  } as React.CSSProperties & {
    '--viewport-margin': string;
    '--viewport-margin-percent': string;
    '--max-image-height': string;
    '--header-height': string;
  };

  return {
    marginPx,
    viewportWidth,
    viewportHeight,
    deviceType,
    marginPercentage,
    maxImageHeight,
    style,
  };
}
