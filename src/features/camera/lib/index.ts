/**
 * Camera feature library exports
 *
 * Centralized exports for all camera utility functions
 */

// Error handling
export {
  CameraError,
  CameraPermissionError,
  CameraDeviceError,
  CameraStreamError,
  CameraErrorCode,
  CameraErrorSeverity,
  mapNativeErrorToCameraError,
  createUnsupportedBrowserError,
  createInsecureContextError,
  createPermissionCheckError,
  createDeviceEnumerationError,
  createTimeoutError,
  isCameraError,
  isCameraPermissionError,
  isCameraDeviceError,
  isCameraStreamError,
} from './errors';

// Browser detection
export {
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
  logBrowserSupport,
  getBrowserName,
  getDeviceType,
} from './browser-detection';

// Device utilities
export {
  detectFacingModeFromLabel,
  mediaDeviceInfoToCameraDevice,
  filterVideoDevices,
  findBackCamera,
  findFrontCamera,
  findDeviceById,
  sortCamerasByPriority,
  groupCamerasByFacingMode,
  isValidDeviceId,
  getCameraDisplayName,
  areDeviceListsEqual,
  getDefaultCamera,
  correctFacingModeWithStream, // Phase 2: facingMode 자동 보정
} from './device-utils';
