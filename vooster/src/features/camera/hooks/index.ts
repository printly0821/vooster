/**
 * Camera hooks exports
 *
 * Centralized exports for all camera-related React hooks
 */

// Main hook
export {
  useCamera,
  useCameraState,
  useCameraActions,
  useCameraReady,
  useCameraError,
  useCameraStreamOnly,
} from './useCamera';

// Internal hooks (exported for advanced use cases)
export { useCameraPermissions } from './useCameraPermissions';
export { useCameraDevices } from './useCameraDevices';
export { useCameraStream } from './useCameraStream';
export { useCameraTorch } from './useCameraTorch';
export { useBarcodeScanner } from './useBarcodeScanner';
export type { UseBarcodeScannerReturn } from './useBarcodeScanner';
export { useCameraVideoRef } from './useCameraVideoRef';
export { useCameraFocus } from './useCameraFocus';
export type { FocusCapability } from './useCameraFocus';
