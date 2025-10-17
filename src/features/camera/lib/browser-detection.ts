/**
 * Browser and device capability detection utilities
 *
 * Provides comprehensive detection for camera-related browser capabilities,
 * with special handling for iOS Safari quirks.
 */

import {
  USER_AGENT_PATTERNS,
  MIN_IOS_VERSION,
  FEATURE_DETECTION,
} from '../constants';
import type {
  CameraBrowserSupport,
  IOSCameraInfo,
  SecureContextInfo,
} from '../types';

/**
 * Detects whether the current browser/device is iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return USER_AGENT_PATTERNS.ios.test(navigator.userAgent);
}

/**
 * Detects whether the current browser is Safari
 */
export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return USER_AGENT_PATTERNS.safari.test(navigator.userAgent);
}

/**
 * Detects whether running in standalone PWA mode (iOS)
 */
export function isStandalonePWA(): boolean {
  return (
    typeof window !== 'undefined' &&
    'standalone' in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * Extracts iOS version from user agent
 *
 * @returns iOS version number or undefined if not iOS/undetectable
 */
export function getIOSVersion(): string | undefined {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (!match) return undefined;

  const [, major, minor, patch] = match;
  return `${major}.${minor}${patch ? `.${patch}` : ''}`;
}

/**
 * Checks if iOS version meets minimum requirement
 */
export function isIOSVersionSupported(): boolean {
  const version = getIOSVersion();
  if (!version) return true; // Assume supported if can't detect

  const majorVersion = parseInt(version.split('.')[0], 10);
  return majorVersion >= MIN_IOS_VERSION;
}

/**
 * Gets comprehensive iOS camera information
 */
export function getIOSCameraInfo(): IOSCameraInfo {
  const isIOSDevice = isIOS();
  const isSafariBrowser = isSafari();
  const version = isIOSDevice ? getIOSVersion() : undefined;
  const isStandalone = isIOSDevice && isStandalonePWA();

  return {
    isIOS: isIOSDevice,
    isSafari: isSafariBrowser,
    version,
    isStandalone,
  };
}

/**
 * Checks if getUserMedia API is available
 */
export function hasGetUserMedia(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Checks if enumerateDevices API is available
 */
export function hasEnumerateDevices(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.enumerateDevices === 'function'
  );
}

/**
 * Checks if Permissions API is available
 *
 * Note: Permissions API support for camera is limited in some browsers
 */
export function hasPermissionsAPI(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.permissions &&
    typeof navigator.permissions.query === 'function'
  );
}

/**
 * Checks if MediaDevices API is available
 */
export function hasMediaDevices(): boolean {
  return !!(typeof navigator !== 'undefined' && navigator.mediaDevices);
}

/**
 * Checks if current context is secure (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Modern browsers
  if ('isSecureContext' in window) {
    return window.isSecureContext;
  }

  // Fallback check using location
  const win = window as Window & typeof globalThis;
  const location = win.location;
  return (
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '[::1]'
  );
}

/**
 * Gets secure context information
 */
export function getSecureContextInfo(): SecureContextInfo {
  if (typeof window === 'undefined') {
    return {
      isSecure: false,
      protocol: 'unknown:',
      isLocalhost: false,
    };
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]';

  return {
    isSecure: isSecureContext(),
    protocol,
    isLocalhost,
  };
}

/**
 * Performs comprehensive browser support detection
 */
export function detectCameraBrowserSupport(): CameraBrowserSupport {
  return {
    hasGetUserMedia: hasGetUserMedia(),
    hasEnumerateDevices: hasEnumerateDevices(),
    hasPermissionsAPI: hasPermissionsAPI(),
    hasMediaDevices: hasMediaDevices(),
    ios: getIOSCameraInfo(),
  };
}

/**
 * Checks if browser fully supports camera functionality
 *
 * @returns true if all required APIs are available
 */
export function isCameraSupported(): boolean {
  const support = detectCameraBrowserSupport();

  return (
    support.hasGetUserMedia &&
    support.hasEnumerateDevices &&
    support.hasMediaDevices
  );
}

/**
 * Gets recommended camera constraints based on browser/device
 *
 * Uses Full HD (1920x1080) resolution for improved barcode recognition,
 * especially for small or distant barcodes.
 *
 * iOS Safari needs special handling due to various quirks
 *
 * @remarks
 * Higher resolution improves barcode detection accuracy at the cost of:
 * - Slightly increased memory usage (~2-3x)
 * - Minimal performance impact on modern devices
 * - Better recognition for small/damaged/angled barcodes
 */
export function getRecommendedConstraints(
  baseConstraints?: MediaStreamConstraints
): MediaStreamConstraints {
  const { ios } = detectCameraBrowserSupport();

  // iOS Safari-specific constraints
  // iOS Safari has better camera support with Full HD
  if (ios.isIOS && ios.isSafari) {
    return {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
      ...baseConstraints,
    };
  }

  // Standard constraints for other browsers
  // Full HD for optimal barcode recognition
  return {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      aspectRatio: { ideal: 16 / 9 },
    },
    audio: false,
    ...baseConstraints,
  };
}

/**
 * Logs browser support information for debugging
 */
export function logBrowserSupport(): void {
  if (typeof window === 'undefined' || !('console' in window)) return;

  const support = detectCameraBrowserSupport();
  const secureContext = getSecureContextInfo();

  console.group('Camera Browser Support');
  console.log('getUserMedia:', support.hasGetUserMedia);
  console.log('enumerateDevices:', support.hasEnumerateDevices);
  console.log('Permissions API:', support.hasPermissionsAPI);
  console.log('MediaDevices:', support.hasMediaDevices);
  console.log('Secure Context:', secureContext.isSecure);
  console.log('Protocol:', secureContext.protocol);
  console.log('iOS:', support.ios.isIOS);
  if (support.ios.isIOS) {
    console.log('iOS Version:', support.ios.version);
    console.log('Safari:', support.ios.isSafari);
    console.log('Standalone:', support.ios.isStandalone);
  }
  console.groupEnd();
}

/**
 * Gets browser name for analytics/logging
 */
export function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;

  if (USER_AGENT_PATTERNS.edge.test(ua)) return 'Edge';
  if (USER_AGENT_PATTERNS.chrome.test(ua)) return 'Chrome';
  if (USER_AGENT_PATTERNS.firefox.test(ua)) return 'Firefox';
  if (USER_AGENT_PATTERNS.safari.test(ua)) return 'Safari';

  return 'Unknown';
}

/**
 * Gets device type for analytics/logging
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent;

  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';

  return 'desktop';
}
