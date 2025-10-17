/**
 * Camera UI Components
 *
 * User-facing components for camera error handling and permission management
 */

export { CameraErrorBanner } from './CameraErrorBanner';
export type { CameraErrorBannerProps } from './CameraErrorBanner';

export { CameraPermissionPrompt } from './CameraPermissionPrompt';
export type { CameraPermissionPromptProps } from './CameraPermissionPrompt';

export {
  CameraDeviceSelector,
  useClearRememberedDevice,
} from './CameraDeviceSelector';
export type { CameraDeviceSelectorProps } from './CameraDeviceSelector';

export {
  CameraStatusIndicator,
  CameraStatusBadge,
} from './CameraStatusIndicator';
export type {
  CameraStatusIndicatorProps,
  CameraStatusBadgeProps,
  CameraStatus,
} from './CameraStatusIndicator';

export { InsecureContextWarning } from './InsecureContextWarning';
export type { InsecureContextWarningProps } from './InsecureContextWarning';

export { BarcodeScanner } from './BarcodeScanner';
export type { BarcodeScannerProps } from './BarcodeScanner';
