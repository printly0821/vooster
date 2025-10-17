/**
 * Camera feature constants
 *
 * Centralized configuration values for camera functionality
 */

/**
 * Default camera constraints for barcode scanning
 *
 * Optimized for QR code and barcode recognition:
 * - Higher resolution for better decode accuracy
 * - Environment-facing camera (back camera) preferred
 * - Standard aspect ratio for wide compatibility
 * - Continuous auto-focus for sharp barcode capture
 * - Advanced constraints for optimal focus distance
 */
export const DEFAULT_CAMERA_CONSTRAINTS = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    aspectRatio: { ideal: 16 / 9 },
    // Advanced constraints for barcode scanning (auto-focus)
    // TypeScript doesn't support focusMode/focusDistance, but browsers do
    advanced: [
      { focusMode: 'continuous' },
      { focusDistance: { ideal: 0.3 } }, // 30cm - optimal for book barcodes
    ] as any[],
  },
  audio: false,
} as const satisfies MediaStreamConstraints;

/**
 * iOS Safari-specific constraints
 *
 * iOS Safari has different behavior and limitations
 * Includes auto-focus for better barcode recognition
 */
export const IOS_CAMERA_CONSTRAINTS = {
  video: {
    facingMode: { exact: 'environment' },
    // iOS Safari works better with explicit dimensions
    width: { ideal: 1280 },
    height: { ideal: 720 },
    // Advanced constraints for auto-focus on iOS
    // TypeScript doesn't support focusMode, but iOS Safari does
    advanced: [{ focusMode: 'continuous' }] as any[],
  },
  audio: false,
} as const satisfies MediaStreamConstraints;

/**
 * Fallback constraints for low-end devices
 */
export const FALLBACK_CAMERA_CONSTRAINTS = {
  video: {
    facingMode: 'environment',
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
  audio: false,
} as const satisfies MediaStreamConstraints;

/**
 * Permission request timeout (ms)
 */
export const PERMISSION_REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Device enumeration timeout (ms)
 */
export const DEVICE_ENUMERATION_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Stream start timeout (ms)
 */
export const STREAM_START_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Maximum retry attempts for recoverable errors
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Delay between retry attempts (ms)
 */
export const RETRY_DELAY_MS = 1000;

/**
 * Maximum number of recent camera devices to remember
 */
export const MAX_RECENT_DEVICES = 5;

/**
 * LocalStorage key for storing last used device ID
 */
export const LAST_DEVICE_ID_STORAGE_KEY = 'vooster:camera:lastDeviceId' as const;

/**
 * LocalStorage key for storing camera preferences
 */
export const CAMERA_PREFERENCES_STORAGE_KEY = 'vooster:camera:preferences' as const;

/**
 * Regex patterns for detecting camera facing mode from device labels
 */
export const CAMERA_LABEL_PATTERNS = {
  back: /back|rear|environment|후면/i,
  front: /front|user|selfie|전면/i,
} as const;

/**
 * Known device labels that should be prioritized
 */
export const PREFERRED_CAMERA_LABELS = [
  'camera2 0, facing back', // Common Android pattern
  'back camera',
  'rear camera',
  'environment',
] as const;

/**
 * User agent patterns for browser detection
 */
export const USER_AGENT_PATTERNS = {
  ios: /iPhone|iPad|iPod/i,
  safari: /^((?!chrome|android).)*safari/i,
  chrome: /chrome|chromium|crios/i,
  firefox: /firefox|fxios/i,
  edge: /edg/i,
} as const;

/**
 * Minimum iOS version for reliable camera support
 */
export const MIN_IOS_VERSION = 11;

/**
 * Feature detection keys
 */
export const FEATURE_DETECTION = {
  getUserMedia: 'navigator.mediaDevices.getUserMedia',
  enumerateDevices: 'navigator.mediaDevices.enumerateDevices',
  permissionsAPI: 'navigator.permissions.query',
  secureContext: 'isSecureContext',
} as const;

/**
 * Error message templates for logging
 */
export const ERROR_LOG_TEMPLATES = {
  permissionDenied: 'Camera permission denied by user',
  deviceNotFound: 'No camera device available',
  streamFailed: 'Failed to start camera stream',
  insecureContext: 'Camera requires HTTPS connection',
  unsupportedBrowser: 'Browser does not support camera API',
} as const;

/**
 * Analytics event names for camera interactions
 */
export const CAMERA_EVENTS = {
  permissionRequested: 'camera_permission_requested',
  permissionGranted: 'camera_permission_granted',
  permissionDenied: 'camera_permission_denied',
  deviceSelected: 'camera_device_selected',
  streamStarted: 'camera_stream_started',
  streamStopped: 'camera_stream_stopped',
  errorOccurred: 'camera_error_occurred',
  retryAttempted: 'camera_retry_attempted',
} as const;

/**
 * Barcode scanning cooldown period (ms)
 *
 * Prevents duplicate scans of the same barcode within this time window
 */
export const BARCODE_SCAN_COOLDOWN_MS = 1500; // 1.5 seconds

/**
 * Vibration pattern for barcode detection
 *
 * Provides haptic feedback when a barcode is successfully scanned
 * Single short vibration of 15ms for minimal disruption
 */
export const BARCODE_VIBRATION_PATTERN = [15] as const;

/**
 * Barcode decode timeout (ms)
 *
 * Maximum time allowed for a single barcode decode operation
 */
export const BARCODE_DECODE_TIMEOUT_MS = 250;

/**
 * Barcode success highlight duration (ms)
 *
 * Duration to display visual feedback after successful scan
 */
export const BARCODE_SUCCESS_HIGHLIGHT_DURATION_MS = 500;

/**
 * Supported barcode formats for @zxing/browser
 *
 * Common formats used in retail, logistics, and general applications
 */
export const SUPPORTED_BARCODE_FORMATS = [
  'QR_CODE',
  'CODE_128',
  'CODE_39',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'DATA_MATRIX',
  'ITF',
  'CODABAR',
] as const;

/**
 * Barcode format type derived from supported formats
 */
export type BarcodeFormat = (typeof SUPPORTED_BARCODE_FORMATS)[number];

/**
 * Torch toggle delay (ms)
 *
 * Small delay to allow hardware to respond after torch state change
 */
export const TORCH_TOGGLE_DELAY_MS = 100;
