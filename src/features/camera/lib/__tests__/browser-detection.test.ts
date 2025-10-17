/**
 * Tests for browser and device capability detection
 *
 * Covers platform detection, API availability checks, secure context detection,
 * and iOS version parsing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isIOS,
  isSafari,
  isStandalonePWA,
  getIOSVersion,
  isIOSVersionSupported,
  getIOSCameraInfo,
  hasGetUserMedia,
  hasEnumerateDevices,
  hasPermissionsAPI,
  hasMediaDevices,
  isSecureContext,
  getSecureContextInfo,
  detectCameraBrowserSupport,
  isCameraSupported,
  getRecommendedConstraints,
  getBrowserName,
  getDeviceType,
} from '../browser-detection';
import {
  setupIOSUserAgent,
  setupSafariUserAgent,
  setupChromeUserAgent,
  setupNavigatorMocks,
  resetAllMocks,
} from '../../__tests__/test-utils';

describe('Platform detection', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('isIOS', () => {
    it('should detect iPhone', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        configurable: true,
      });

      expect(isIOS()).toBe(true);
    });

    it('should detect iPad', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)',
        configurable: true,
      });

      expect(isIOS()).toBe(true);
    });

    it('should detect iPod', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)',
        configurable: true,
      });

      expect(isIOS()).toBe(true);
    });

    it('should return false for non-iOS devices', () => {
      setupChromeUserAgent();
      expect(isIOS()).toBe(false);
    });
  });

  describe('isSafari', () => {
    it('should detect Safari', () => {
      setupSafariUserAgent();
      expect(isSafari()).toBe(true);
    });

    it('should not detect Chrome as Safari', () => {
      setupChromeUserAgent();
      expect(isSafari()).toBe(false);
    });

    it('should detect iOS Safari', () => {
      setupIOSUserAgent();
      expect(isSafari()).toBe(true);
    });
  });

  describe('isStandalonePWA', () => {
    it('should detect standalone mode', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        configurable: true,
      });

      expect(isStandalonePWA()).toBe(true);
    });

    it('should return false when not in standalone mode', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        configurable: true,
      });

      expect(isStandalonePWA()).toBe(false);
    });

    it('should return false when standalone property does not exist', () => {
      expect(isStandalonePWA()).toBe(false);
    });
  });

  describe('getIOSVersion', () => {
    it('should extract iOS version correctly', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X)',
        configurable: true,
      });

      expect(getIOSVersion()).toBe('15.4.1');
    });

    it('should extract version without patch number', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });

      expect(getIOSVersion()).toBe('14.0');
    });

    it('should return undefined for non-iOS devices', () => {
      setupChromeUserAgent();
      expect(getIOSVersion()).toBeUndefined();
    });

    it('should handle malformed version strings', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone like Mac OS X)',
        configurable: true,
      });

      expect(getIOSVersion()).toBeUndefined();
    });
  });

  describe('isIOSVersionSupported', () => {
    it('should return true for iOS 15', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        configurable: true,
      });

      expect(isIOSVersionSupported()).toBe(true);
    });

    it('should return true for iOS 11 (minimum version)', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X)',
        configurable: true,
      });

      expect(isIOSVersionSupported()).toBe(true);
    });

    it('should return false for iOS 10', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0 like Mac OS X)',
        configurable: true,
      });

      expect(isIOSVersionSupported()).toBe(false);
    });

    it('should return true when version cannot be detected', () => {
      setupChromeUserAgent();
      expect(isIOSVersionSupported()).toBe(true);
    });
  });

  describe('getIOSCameraInfo', () => {
    it('should return complete iOS info', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        configurable: true,
      });

      const info = getIOSCameraInfo();

      expect(info.isIOS).toBe(true);
      expect(info.isSafari).toBe(true);
      expect(info.version).toBe('15.0');
      expect(info.isStandalone).toBe(true);
    });

    it('should return correct info for non-iOS device', () => {
      setupChromeUserAgent();

      const info = getIOSCameraInfo();

      expect(info.isIOS).toBe(false);
      expect(info.isSafari).toBe(false);
      expect(info.version).toBeUndefined();
      expect(info.isStandalone).toBe(false);
    });
  });
});

describe('API availability checks', () => {
  beforeEach(() => {
    setupNavigatorMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('hasGetUserMedia', () => {
    it('should return true when getUserMedia is available', () => {
      expect(hasGetUserMedia()).toBe(true);
    });

    it('should return false when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      delete (global as { navigator?: Navigator }).navigator;

      expect(hasGetUserMedia()).toBe(false);

      global.navigator = originalNavigator;
    });

    it('should return false when mediaDevices is undefined', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      expect(hasGetUserMedia()).toBe(false);
    });

    it('should return false when getUserMedia is not a function', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: null },
        configurable: true,
      });

      expect(hasGetUserMedia()).toBe(false);
    });
  });

  describe('hasEnumerateDevices', () => {
    it('should return true when enumerateDevices is available', () => {
      expect(hasEnumerateDevices()).toBe(true);
    });

    it('should return false when not available', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { enumerateDevices: null },
        configurable: true,
      });

      expect(hasEnumerateDevices()).toBe(false);
    });
  });

  describe('hasPermissionsAPI', () => {
    it('should return true when Permissions API is available', () => {
      expect(hasPermissionsAPI()).toBe(true);
    });

    it('should return false when permissions is undefined', () => {
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        configurable: true,
      });

      expect(hasPermissionsAPI()).toBe(false);
    });

    it('should return false when query is not a function', () => {
      Object.defineProperty(global.navigator, 'permissions', {
        value: { query: null },
        configurable: true,
      });

      expect(hasPermissionsAPI()).toBe(false);
    });
  });

  describe('hasMediaDevices', () => {
    it('should return true when MediaDevices API is available', () => {
      expect(hasMediaDevices()).toBe(true);
    });

    it('should return false when mediaDevices is undefined', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      expect(hasMediaDevices()).toBe(false);
    });
  });
});

describe('Secure context detection', () => {
  describe('isSecureContext', () => {
    it('should return true when isSecureContext is true', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        configurable: true,
      });

      expect(isSecureContext()).toBe(true);
    });

    it('should return true for https', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', hostname: 'example.com' },
        configurable: true,
      });

      expect(isSecureContext()).toBe(true);
    });

    it('should return true for localhost', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'localhost' },
        configurable: true,
      });

      expect(isSecureContext()).toBe(true);
    });

    it('should return true for 127.0.0.1', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: '127.0.0.1' },
        configurable: true,
      });

      expect(isSecureContext()).toBe(true);
    });

    it('should return true for ::1', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: '[::1]' },
        configurable: true,
      });

      expect(isSecureContext()).toBe(true);
    });

    it('should return false for http on non-localhost', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'example.com' },
        configurable: true,
      });

      expect(isSecureContext()).toBe(false);
    });
  });

  describe('getSecureContextInfo', () => {
    it('should return complete secure context info for https', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        configurable: true,
      });
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', hostname: 'example.com' },
        configurable: true,
      });

      const info = getSecureContextInfo();

      expect(info.isSecure).toBe(true);
      expect(info.protocol).toBe('https:');
      expect(info.isLocalhost).toBe(false);
    });

    it('should detect localhost correctly', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'localhost' },
        configurable: true,
      });

      const info = getSecureContextInfo();

      expect(info.isLocalhost).toBe(true);
    });

    it('should handle insecure context', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'example.com' },
        configurable: true,
      });

      const info = getSecureContextInfo();

      expect(info.isSecure).toBe(false);
      expect(info.protocol).toBe('http:');
      expect(info.isLocalhost).toBe(false);
    });
  });
});

describe('Comprehensive browser support detection', () => {
  beforeEach(() => {
    setupNavigatorMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('detectCameraBrowserSupport', () => {
    it('should detect all capabilities', () => {
      setupIOSUserAgent();

      const support = detectCameraBrowserSupport();

      expect(support.hasGetUserMedia).toBe(true);
      expect(support.hasEnumerateDevices).toBe(true);
      expect(support.hasPermissionsAPI).toBe(true);
      expect(support.hasMediaDevices).toBe(true);
      expect(support.ios.isIOS).toBe(true);
      expect(support.ios.isSafari).toBe(true);
    });

    it('should work for non-iOS devices', () => {
      setupChromeUserAgent();

      const support = detectCameraBrowserSupport();

      expect(support.ios.isIOS).toBe(false);
      expect(support.ios.isSafari).toBe(false);
    });
  });

  describe('isCameraSupported', () => {
    it('should return true when all required APIs are available', () => {
      expect(isCameraSupported()).toBe(true);
    });

    it('should return false when getUserMedia is missing', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          enumerateDevices: vi.fn(),
        },
        configurable: true,
      });

      expect(isCameraSupported()).toBe(false);
    });

    it('should return false when enumerateDevices is missing', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn(),
        },
        configurable: true,
      });

      expect(isCameraSupported()).toBe(false);
    });
  });
});

describe('Recommended constraints', () => {
  describe('getRecommendedConstraints', () => {
    it('should return iOS-specific constraints for iOS Safari', () => {
      setupIOSUserAgent();

      const constraints = getRecommendedConstraints();

      expect(constraints.video).toMatchObject({
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      });
      expect(constraints.audio).toBe(false);
    });

    it('should return standard constraints for Chrome', () => {
      setupChromeUserAgent();

      const constraints = getRecommendedConstraints();

      expect(constraints.video).toMatchObject({
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        aspectRatio: { ideal: 16 / 9 },
      });
    });

    it('should merge with base constraints', () => {
      setupChromeUserAgent();

      const base: MediaStreamConstraints = {
        audio: true,
      };

      const constraints = getRecommendedConstraints(base);

      expect(constraints.audio).toBe(true);
      expect(constraints.video).toBeDefined();
    });
  });
});

describe('Browser and device identification', () => {
  describe('getBrowserName', () => {
    it('should detect Chrome', () => {
      setupChromeUserAgent();
      expect(getBrowserName()).toBe('Chrome');
    });

    it('should detect Safari', () => {
      setupSafariUserAgent();
      expect(getBrowserName()).toBe('Safari');
    });

    it('should detect Edge', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        configurable: true,
      });

      expect(getBrowserName()).toBe('Edge');
    });

    it('should detect Firefox', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
        configurable: true,
      });

      expect(getBrowserName()).toBe('Firefox');
    });

    it('should return Unknown for unrecognized browsers', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Some Unknown Browser',
        configurable: true,
      });

      expect(getBrowserName()).toBe('Unknown');
    });
  });

  describe('getDeviceType', () => {
    it('should detect mobile devices', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        configurable: true,
      });

      expect(getDeviceType()).toBe('mobile');
    });

    it('should detect tablets', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      });

      expect(getDeviceType()).toBe('tablet');
    });

    it('should default to desktop', () => {
      setupChromeUserAgent();
      expect(getDeviceType()).toBe('desktop');
    });
  });
});
