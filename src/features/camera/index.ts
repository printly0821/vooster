/**
 * Camera feature - Main exports
 *
 * Public API for camera permission handling, device management,
 * and stream control for barcode scanning application.
 */

// Types
export type {
  CameraPermissionState,
  CameraDevice,
  SecureContextInfo,
  CameraContextState,
  CameraContextActions,
  CameraContextValue,
  CameraConstraints,
  CameraInitOptions,
  IOSCameraInfo,
  CameraBrowserSupport,
  BarcodeResult,
  BarcodeScannerState,
  BarcodeScannerConfig,
  TorchCapability,
} from './types';

// Error types
export type { CameraError } from './lib/errors';
export { CameraErrorCode, CameraErrorSeverity } from './lib/errors';

// Constants
export {
  DEFAULT_CAMERA_CONSTRAINTS,
  IOS_CAMERA_CONSTRAINTS,
  FALLBACK_CAMERA_CONSTRAINTS,
  PERMISSION_REQUEST_TIMEOUT_MS,
  DEVICE_ENUMERATION_TIMEOUT_MS,
  STREAM_START_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  CAMERA_EVENTS,
  BARCODE_SCAN_COOLDOWN_MS,
  BARCODE_DECODE_TIMEOUT_MS,
  BARCODE_VIBRATION_PATTERN,
  BARCODE_SUCCESS_HIGHLIGHT_DURATION_MS,
  SUPPORTED_BARCODE_FORMATS,
  TORCH_TOGGLE_DELAY_MS,
} from './constants';
export type { BarcodeFormat } from './constants';

// Context and Provider
export { CameraProvider, CameraContext, CameraVideoRefContext } from './context';
export type { CameraProviderProps } from './context';

// Hooks
export {
  useCamera,
  useCameraState,
  useCameraActions,
  useCameraReady,
  useCameraError,
  useCameraStreamOnly,
  useBarcodeScanner,
  useCameraTorch,
  useCameraVideoRef,
  useCameraFocus,
} from './hooks';
export type { UseBarcodeScannerReturn, FocusCapability } from './hooks';

// UI Components
export {
  CameraErrorBanner,
  CameraPermissionPrompt,
  CameraDeviceSelector,
  CameraStatusIndicator,
  CameraStatusBadge,
  InsecureContextWarning,
  BarcodeScanner,
  useClearRememberedDevice,
} from './components';
export type {
  CameraErrorBannerProps,
  CameraPermissionPromptProps,
  CameraDeviceSelectorProps,
  CameraStatusIndicatorProps,
  CameraStatusBadgeProps,
  CameraStatus,
  InsecureContextWarningProps,
  BarcodeScannerProps,
} from './components';

// Utility functions
export {
  // Error handling
  mapNativeErrorToCameraError,
  createUnsupportedBrowserError,
  createInsecureContextError,
  isCameraError,

  // Browser detection
  detectCameraBrowserSupport,
  isCameraSupported,
  isSecureContext,
  getSecureContextInfo,
  getRecommendedConstraints,

  // Device utilities
  findBackCamera,
  findFrontCamera,
  findDeviceById,
  getCameraDisplayName,
  getDefaultCamera,
} from './lib';
