/**
 * useAndroidDetection Hook
 *
 * Android 디바이스 및 브라우저 정보를 감지합니다.
 * - Android OS 여부
 * - Chrome 버전
 * - Gesture Navigation 지원 여부
 * - 제조사 정보 (Samsung, Xiaomi 등)
 *
 * @returns {Object} Android 정보 객체
 */

'use client';

import { useState, useEffect } from 'react';

export interface AndroidInfo {
  /** Android 디바이스 여부 */
  isAndroid: boolean;
  /** Chrome 브라우저 버전 */
  chromeVersion: number;
  /** Gesture Navigation 지원 여부 (Android 10+) */
  hasGestureNav: boolean;
  /** 기기 제조사 (samsung, xiaomi, huawei 등) */
  manufacturer: string;
  /** WebView 여부 */
  isWebView: boolean;
  /** 디바이스 픽셀 비율 */
  devicePixelRatio: number;
  /** Visual Viewport API 지원 여부 */
  hasVisualViewport: boolean;
}

/**
 * User Agent에서 정보 추출
 */
function parseUserAgent(): Omit<AndroidInfo, 'hasVisualViewport'> {
  const ua = navigator.userAgent;

  // Android 여부
  const isAndroid = /Android/i.test(ua);

  // Chrome 버전 추출
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 0;

  // Gesture Navigation: Android 10+ (API 29+) 추정
  // Chrome 90 이상에서 기본 지원
  const hasGestureNav = isAndroid && chromeVersion >= 90;

  // 제조사 식별
  let manufacturer = 'generic';
  if (/samsung/i.test(ua)) {
    manufacturer = 'samsung';
  } else if (/xiaomi/i.test(ua)) {
    manufacturer = 'xiaomi';
  } else if (/huawei/i.test(ua) || /honor/i.test(ua)) {
    manufacturer = 'huawei';
  } else if (/oppo/i.test(ua)) {
    manufacturer = 'oppo';
  } else if (/vivo/i.test(ua)) {
    manufacturer = 'vivo';
  } else if (/oneplus/i.test(ua)) {
    manufacturer = 'oneplus';
  }

  // WebView 여부 (Chrome을 포함하지 않거나 특정 패턴)
  const isWebView =
    /wv|Version\/[\d.]+\s+Chrome/.test(ua) || // Android WebView
    /UCBrowser|MQQBrowser|SogouMSE|ELV-Browser|Electron/.test(ua) || // 다른 WebView
    !chromeMatch; // Chrome 버전을 찾을 수 없음

  return {
    isAndroid,
    chromeVersion,
    hasGestureNav,
    manufacturer,
    isWebView,
    devicePixelRatio: window.devicePixelRatio,
  };
}

/**
 * Android 감지 훅
 */
export function useAndroidDetection(): AndroidInfo {
  const [androidInfo, setAndroidInfo] = useState<AndroidInfo>({
    isAndroid: false,
    chromeVersion: 0,
    hasGestureNav: false,
    manufacturer: 'generic',
    isWebView: false,
    devicePixelRatio: 1,
    hasVisualViewport: false,
  });

  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window === 'undefined') return;

    const info = parseUserAgent();
    const hasVisualViewport = 'visualViewport' in window;

    setAndroidInfo({
      ...info,
      hasVisualViewport,
    });
  }, []);

  return androidInfo;
}

/**
 * StatusBar 높이 계산 (Android용)
 * 일반적으로 24dp
 */
export function getAndroidStatusBarHeight(dpr: number = window.devicePixelRatio): number {
  // 24dp를 픽셀로 변환
  return Math.round(24 * dpr);
}

/**
 * NavigationBar 높이 계산 (Android용)
 * - Gesture Navigation: 24dp
 * - 3-button Navigation: 48dp
 */
export function getAndroidNavigationBarHeight(
  hasGestureNav: boolean = true,
  dpr: number = window.devicePixelRatio
): number {
  // Gesture Navigation: 24dp, 3-button: 48dp
  const heightDp = hasGestureNav ? 24 : 48;
  return Math.round(heightDp * dpr);
}

/**
 * Visual Viewport API를 사용하여 실제 뷰포트 높이 계산
 * NavigationBar가 숨겨지지 않은 경우의 하단 inset 계산
 */
export function getAndroidBottomInsetFromViewport(): number {
  if (typeof window === 'undefined' || !('visualViewport' in window)) {
    return 0;
  }

  const viewport = window.visualViewport;
  if (!viewport) return 0;

  // 실제 가용 높이와 전체 높이의 차이
  const bottomInset = window.innerHeight - viewport.height;
  return Math.max(0, bottomInset);
}

/**
 * 제조사별 특화 inset 값
 * (필요시 확장 가능)
 */
export interface ManufacturerInsets {
  statusBar: number;
  navBar: number;
}

export function getManufacturerSpecificInsets(
  manufacturer: string,
  hasGestureNav: boolean,
  dpr: number
): ManufacturerInsets {
  // 대부분의 제조사는 표준 값 사용
  // 나중에 특정 제조사의 커스텀 값으로 확장 가능

  return {
    statusBar: getAndroidStatusBarHeight(dpr),
    navBar: getAndroidNavigationBarHeight(hasGestureNav, dpr),
  };
}
