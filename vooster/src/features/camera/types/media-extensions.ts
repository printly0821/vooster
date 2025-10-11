/**
 * Extended Media Track Types
 *
 * TypeScript의 기본 MediaTrackCapabilities는 실험적 속성을 포함하지 않음.
 * 이 파일은 @ts-ignore 없이 타입 안전하게 사용하기 위한 확장 타입 정의.
 *
 * @module features/camera/types/media-extensions
 *
 * @see https://w3c.github.io/mediacapture-image/
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackCapabilities
 */

/**
 * Extended MediaTrackCapabilities with experimental features
 *
 * Includes properties not yet in TypeScript's DOM lib but available in modern browsers.
 */
export interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  /** Available focus modes (e.g., 'continuous', 'manual', 'single-shot') */
  focusMode?: ('continuous' | 'manual' | 'single-shot')[];

  /** Focus distance range in meters */
  focusDistance?: {
    min: number;
    max: number;
    step: number;
  };

  /** Whether torch (flashlight) is supported */
  torch?: boolean;

  /** Available exposure modes */
  exposureMode?: ('manual' | 'continuous' | 'single-shot')[];

  /** Exposure compensation range in EV steps */
  exposureCompensation?: {
    min: number;
    max: number;
    step: number;
  };

  /** ISO sensitivity range */
  iso?: {
    min: number;
    max: number;
    step: number;
  };

  /** Available white balance modes */
  whiteBalanceMode?: ('auto' | 'manual')[];

  /** Color temperature range in Kelvin */
  colorTemperature?: {
    min: number;
    max: number;
    step: number;
  };
}

/**
 * Extended MediaTrackSettings with experimental features
 *
 * Current settings/values for experimental features.
 */
export interface ExtendedMediaTrackSettings extends MediaTrackSettings {
  /** Current focus mode */
  focusMode?: 'continuous' | 'manual' | 'single-shot';

  /** Current focus distance in meters */
  focusDistance?: number;

  /** Current torch (flashlight) state */
  torch?: boolean;

  /** Current exposure mode */
  exposureMode?: 'manual' | 'continuous' | 'single-shot';

  /** Current exposure compensation in EV steps */
  exposureCompensation?: number;

  /** Current ISO sensitivity */
  iso?: number;

  /** Current white balance mode */
  whiteBalanceMode?: 'auto' | 'manual';

  /** Current color temperature in Kelvin */
  colorTemperature?: number;
}

/**
 * Extended MediaTrackConstraintSet with experimental features
 *
 * Constraint values for experimental features when requesting camera access.
 */
export interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  /** Desired focus mode */
  focusMode?: 'continuous' | 'manual' | 'single-shot';

  /** Desired focus distance */
  focusDistance?: number | ConstrainDouble;

  /** Desired torch state */
  torch?: boolean;

  /** Desired exposure mode */
  exposureMode?: 'manual' | 'continuous' | 'single-shot';

  /** Desired exposure compensation */
  exposureCompensation?: number | ConstrainDouble;

  /** Desired ISO sensitivity */
  iso?: number | ConstrainDouble;

  /** Desired white balance mode */
  whiteBalanceMode?: 'auto' | 'manual';

  /** Desired color temperature */
  colorTemperature?: number | ConstrainDouble;
}

/**
 * Type guard to check if capabilities support focus
 *
 * @param caps - Media track capabilities to check
 * @returns true if capabilities include focus properties
 *
 * @example
 * ```ts
 * const caps = track.getCapabilities();
 * if (hasFocusCapabilities(caps)) {
 *   // TypeScript knows caps.focusMode exists
 *   console.log('Focus modes:', caps.focusMode);
 * }
 * ```
 */
export function hasFocusCapabilities(
  caps: MediaTrackCapabilities
): caps is ExtendedMediaTrackCapabilities {
  return 'focusMode' in caps;
}

/**
 * Type guard to check if capabilities support torch
 *
 * @param caps - Media track capabilities to check
 * @returns true if capabilities include torch property
 *
 * @example
 * ```ts
 * const caps = track.getCapabilities();
 * if (hasTorchCapabilities(caps)) {
 *   // TypeScript knows caps.torch exists
 *   console.log('Torch supported:', caps.torch);
 * }
 * ```
 */
export function hasTorchCapabilities(
  caps: MediaTrackCapabilities
): caps is ExtendedMediaTrackCapabilities {
  return 'torch' in caps;
}

/**
 * Type guard to check if capabilities support exposure control
 *
 * @param caps - Media track capabilities to check
 * @returns true if capabilities include exposure properties
 *
 * @example
 * ```ts
 * const caps = track.getCapabilities();
 * if (hasExposureCapabilities(caps)) {
 *   // TypeScript knows caps.exposureMode exists
 *   console.log('Exposure modes:', caps.exposureMode);
 * }
 * ```
 */
export function hasExposureCapabilities(
  caps: MediaTrackCapabilities
): caps is ExtendedMediaTrackCapabilities {
  return 'exposureMode' in caps;
}

/**
 * Type guard to check if settings include extended properties
 *
 * @param settings - Media track settings to check
 * @returns true if settings include extended properties
 */
export function hasExtendedSettings(
  settings: MediaTrackSettings
): settings is ExtendedMediaTrackSettings {
  return 'focusMode' in settings || 'torch' in settings || 'exposureMode' in settings;
}
