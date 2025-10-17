/**
 * Camera feature type definitions
 *
 * Provides comprehensive type safety for camera permission handling,
 * device management, and error scenarios in barcode scanning application.
 */

/**
 * Camera permission states based on Permissions API
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API
 */
export type CameraPermissionState =
  | 'granted'      // User has granted camera access
  | 'denied'       // User has explicitly denied camera access
  | 'prompt'       // Permission not yet requested (initial state)
  | 'unsupported'; // Browser/device doesn't support camera or Permissions API

/**
 * Represents a camera device available on the user's system
 *
 * Based on MediaDeviceInfo interface with additional utility properties
 */
export interface CameraDevice {
  /** Unique identifier for the device */
  readonly deviceId: string;

  /** Human-readable device label (empty if permission not granted) */
  readonly label: string;

  /** Device group identifier for related devices */
  readonly groupId: string;

  /**
   * Camera facing mode if detectable from label
   * Useful for mobile devices to distinguish front/back cameras
   */
  readonly facingMode?: 'user' | 'environment';

  /**
   * Whether this is the currently selected/active device
   */
  readonly isActive?: boolean;
}

/**
 * Secure context requirements for camera access
 *
 * MediaDevices API requires secure context (HTTPS) in most browsers
 */
export interface SecureContextInfo {
  /** Whether the current context is secure (HTTPS or localhost) */
  readonly isSecure: boolean;

  /** Current protocol (http, https, file, etc.) */
  readonly protocol: string;

  /** Whether running on localhost (treated as secure) */
  readonly isLocalhost: boolean;
}

/**
 * Complete state of the camera feature
 *
 * This represents the context value that will be provided to consumers
 */
export interface CameraContextState {
  /** Current permission state */
  readonly permissionState: CameraPermissionState;

  /** Whether permission check is in progress */
  readonly isCheckingPermission: boolean;

  /** List of available camera devices */
  readonly devices: ReadonlyArray<CameraDevice>;

  /** Whether device enumeration is in progress */
  readonly isEnumeratingDevices: boolean;

  /** Currently selected camera device */
  readonly selectedDevice: CameraDevice | null;

  /** Current error if any */
  readonly error: CameraError | null;

  /** Secure context information */
  readonly secureContext: SecureContextInfo;

  /** Whether the camera stream is currently active */
  readonly isStreamActive: boolean;

  /** Current MediaStream if camera is active */
  readonly stream: MediaStream | null;

  /** Barcode scanner state and results */
  readonly barcodeScanner: BarcodeScannerState;

  /** Torch (flashlight) capability and state */
  readonly torchCapability: TorchCapability;
}

/**
 * Actions available in camera context
 *
 * Separated from state to follow React context best practices
 */
export interface CameraContextActions {
  /** Request camera permission from user */
  requestPermission: () => Promise<CameraPermissionState>;

  /** Enumerate available camera devices */
  enumerateDevices: () => Promise<CameraDevice[]>;

  /** Select a specific camera device */
  selectDevice: (deviceId: string) => Promise<void>;

  /** Start camera stream with selected device */
  startStream: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;

  /** Stop current camera stream */
  stopStream: () => void;

  /** Clear current error */
  clearError: () => void;

  /** Retry last failed operation */
  retry: () => Promise<void>;

  /** Start barcode scanning with optional configuration */
  startBarcodeScanning: (config?: BarcodeScannerConfig) => Promise<void>;

  /** Stop barcode scanning completely */
  stopBarcodeScanning: () => void;

  /** Temporarily pause barcode scanning */
  pauseBarcodeScanning: () => void;

  /** Resume paused barcode scanning */
  resumeBarcodeScanning: () => void;

  /** Toggle torch (flashlight) on/off */
  toggleTorch: () => Promise<void>;
}

/**
 * Complete camera context value
 */
export type CameraContextValue = CameraContextState & CameraContextActions;

/**
 * MediaStream constraints builder utility type
 *
 * Provides type-safe constraint building for getUserMedia
 */
export interface CameraConstraints {
  /** Specific device ID to use */
  deviceId?: string;

  /** Preferred facing mode */
  facingMode?: 'user' | 'environment';

  /** Desired video width */
  width?: number | { ideal?: number; min?: number; max?: number };

  /** Desired video height */
  height?: number | { ideal?: number; min?: number; max?: number };

  /** Frame rate constraints */
  frameRate?: number | { ideal?: number; min?: number; max?: number };

  /** Aspect ratio constraints */
  aspectRatio?: number | { ideal?: number; min?: number; max?: number };
}

/**
 * Camera initialization options
 */
export interface CameraInitOptions {
  /** Auto-request permission on mount */
  autoRequest?: boolean;

  /** Auto-enumerate devices after permission granted */
  autoEnumerate?: boolean;

  /** Auto-select first available back camera */
  autoSelectBackCamera?: boolean;

  /** Auto-start stream after device selected */
  autoStartStream?: boolean;

  /** Default constraints for camera stream */
  defaultConstraints?: CameraConstraints;

  /** Error retry configuration */
  retryConfig?: {
    maxAttempts?: number;
    delayMs?: number;
  };
}

/**
 * iOS Safari specific behavior tracking
 *
 * iOS Safari has unique camera permission and behavior patterns
 */
export interface IOSCameraInfo {
  /** Whether running on iOS */
  readonly isIOS: boolean;

  /** Whether running in Safari */
  readonly isSafari: boolean;

  /** iOS version if detectable */
  readonly version?: string;

  /**
   * Whether in standalone PWA mode
   * Different permission behavior in standalone vs browser
   */
  readonly isStandalone: boolean;
}

/**
 * Browser capability detection
 */
export interface CameraBrowserSupport {
  /** Whether getUserMedia is supported */
  readonly hasGetUserMedia: boolean;

  /** Whether enumerateDevices is supported */
  readonly hasEnumerateDevices: boolean;

  /** Whether Permissions API is supported */
  readonly hasPermissionsAPI: boolean;

  /** Whether MediaDevices API is available */
  readonly hasMediaDevices: boolean;

  /** iOS-specific information */
  readonly ios: IOSCameraInfo;
}

/**
 * Error type placeholder - will be defined in lib/errors.ts
 * Imported here for type reference only
 */
export interface CameraError {
  readonly code: string;
  readonly severity: string;
  readonly userMessage: string;
  readonly technicalMessage: string;
  readonly recoverySuggestions: readonly string[];
  readonly timestamp: string;
  readonly isRetryable: boolean;
  readonly originalError?: Error;
}

/**
 * Barcode scan result
 *
 * Represents a successfully decoded barcode with metadata
 */
export interface BarcodeResult {
  /** Decoded text content from the barcode */
  readonly text: string;

  /** Barcode format (e.g., QR_CODE, CODE_128) */
  readonly format: string;

  /** Timestamp when the barcode was detected (Unix milliseconds) */
  readonly timestamp: number;

  /** Optional bounding box coordinates of the detected barcode */
  readonly boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Barcode scanner state
 *
 * Tracks the current state of barcode scanning operations
 */
export interface BarcodeScannerState {
  /** Whether barcode scanning is currently active */
  readonly isScanning: boolean;

  /** Whether scanning is temporarily paused (but not stopped) */
  readonly isPaused: boolean;

  /** Last successfully scanned barcode result */
  readonly lastResult: BarcodeResult | null;

  /** Current scanner error if any */
  readonly error: CameraError | null;
}

/**
 * Barcode scanner configuration
 *
 * Options for configuring barcode scanner behavior
 */
export interface BarcodeScannerConfig {
  /** Cooldown period between consecutive scans (milliseconds) */
  readonly cooldownMs?: number;

  /** Whether to continuously decode barcodes or stop after first detection */
  readonly decodeContinuously?: boolean;

  /** Specific barcode formats to detect (defaults to all supported formats) */
  readonly formats?: string[];

  /** Callback when a barcode is successfully detected */
  readonly onDetected?: (result: BarcodeResult) => void;

  /** Callback when a scanner error occurs */
  readonly onError?: (error: CameraError) => void;
}

/**
 * Torch (flashlight) capability
 *
 * Tracks torch availability and current state
 */
export interface TorchCapability {
  /** Whether the device supports torch/flashlight */
  readonly isSupported: boolean;

  /** Whether the torch is currently enabled */
  readonly isEnabled: boolean;
}
