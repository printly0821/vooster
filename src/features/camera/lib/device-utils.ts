/**
 * Camera device utility functions
 *
 * Provides helpers for device enumeration, filtering, and selection
 */

import { CAMERA_LABEL_PATTERNS, PREFERRED_CAMERA_LABELS } from '../constants';
import type { CameraDevice } from '../types';

/**
 * Detects camera facing mode from device label
 *
 * Uses heuristics based on common device label patterns
 */
export function detectFacingModeFromLabel(
  label: string
): 'user' | 'environment' | undefined {
  if (!label) return undefined;

  const lowerLabel = label.toLowerCase();

  if (CAMERA_LABEL_PATTERNS.back.test(lowerLabel)) {
    return 'environment';
  }

  if (CAMERA_LABEL_PATTERNS.front.test(lowerLabel)) {
    return 'user';
  }

  return undefined;
}

/**
 * Converts MediaDeviceInfo to CameraDevice
 */
export function mediaDeviceInfoToCameraDevice(
  device: MediaDeviceInfo,
  isActive = false
): CameraDevice {
  return {
    deviceId: device.deviceId,
    label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
    groupId: device.groupId,
    facingMode: detectFacingModeFromLabel(device.label),
    isActive,
  };
}

/**
 * Filters video input devices from media device list
 */
export function filterVideoDevices(
  devices: MediaDeviceInfo[]
): MediaDeviceInfo[] {
  return devices.filter((device) => device.kind === 'videoinput');
}

/**
 * Finds back/environment-facing camera
 */
export function findBackCamera(devices: CameraDevice[]): CameraDevice | null {
  // First, try to find by facingMode
  const backCamera = devices.find(
    (device) => device.facingMode === 'environment'
  );

  if (backCamera) return backCamera;

  // Fallback: try to find by label patterns
  const cameraByLabel = devices.find((device) =>
    CAMERA_LABEL_PATTERNS.back.test(device.label)
  );

  if (cameraByLabel) return cameraByLabel;

  // Last resort: return first device (assume back camera on mobile)
  return devices[0] || null;
}

/**
 * Finds front/user-facing camera
 */
export function findFrontCamera(devices: CameraDevice[]): CameraDevice | null {
  // First, try to find by facingMode
  const frontCamera = devices.find((device) => device.facingMode === 'user');

  if (frontCamera) return frontCamera;

  // Fallback: try to find by label patterns
  const cameraByLabel = devices.find((device) =>
    CAMERA_LABEL_PATTERNS.front.test(device.label)
  );

  return cameraByLabel || null;
}

/**
 * Finds device by ID from device list
 */
export function findDeviceById(
  devices: CameraDevice[],
  deviceId: string
): CameraDevice | null {
  return devices.find((device) => device.deviceId === deviceId) || null;
}

/**
 * Sorts cameras by priority for barcode scanning
 *
 * Priority order:
 * 1. Back/environment cameras
 * 2. Preferred labels
 * 3. Cameras with labels
 * 4. Everything else
 */
export function sortCamerasByPriority(devices: CameraDevice[]): CameraDevice[] {
  return [...devices].sort((a, b) => {
    // Prioritize back cameras
    if (a.facingMode === 'environment' && b.facingMode !== 'environment')
      return -1;
    if (a.facingMode !== 'environment' && b.facingMode === 'environment')
      return 1;

    // Prioritize preferred labels
    const aPreferred = PREFERRED_CAMERA_LABELS.some((pattern) =>
      a.label.toLowerCase().includes(pattern)
    );
    const bPreferred = PREFERRED_CAMERA_LABELS.some((pattern) =>
      b.label.toLowerCase().includes(pattern)
    );

    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;

    // Prioritize cameras with labels
    const aHasLabel = a.label && !a.label.startsWith('Camera ');
    const bHasLabel = b.label && !b.label.startsWith('Camera ');

    if (aHasLabel && !bHasLabel) return -1;
    if (!aHasLabel && bHasLabel) return 1;

    // Maintain original order
    return 0;
  });
}

/**
 * Groups cameras by facing mode
 */
export function groupCamerasByFacingMode(devices: CameraDevice[]): {
  back: CameraDevice[];
  front: CameraDevice[];
  unknown: CameraDevice[];
} {
  const back: CameraDevice[] = [];
  const front: CameraDevice[] = [];
  const unknown: CameraDevice[] = [];

  for (const device of devices) {
    if (device.facingMode === 'environment') {
      back.push(device);
    } else if (device.facingMode === 'user') {
      front.push(device);
    } else {
      unknown.push(device);
    }
  }

  return { back, front, unknown };
}

/**
 * Validates if device ID is valid
 */
export function isValidDeviceId(deviceId: string): boolean {
  return typeof deviceId === 'string' && deviceId.length > 0;
}

/**
 * Creates a display name for camera device
 *
 * Generates user-friendly name based on label and facing mode
 * P0-2: 개선된 한글화 로직
 */
export function getCameraDisplayName(device: CameraDevice): string {
  // 1. 유의미한 라벨이면 그대로 사용 (원본 디바이스 라벨)
  if (device.label &&
      !device.label.startsWith('Camera ') &&
      !device.label.includes('camera2 0') &&
      device.label.toLowerCase() !== 'unknown') {
    return device.label;
  }

  // 2. facingMode 기반 명확한 한글 이름
  if (device.facingMode === 'environment') {
    return '후면 카메라 (바코드 스캔 권장)';
  }

  if (device.facingMode === 'user') {
    return '전면 카메라';
  }

  // 3. label에서 facing 정보 파싱 시도
  if (device.label) {
    const lowerLabel = device.label.toLowerCase();

    if (lowerLabel.includes('back') || lowerLabel.includes('rear')) {
      return '후면 카메라 (바코드 스캔 권장)';
    }

    if (lowerLabel.includes('front') || lowerLabel.includes('selfie')) {
      return '전면 카메라';
    }

    // label이 있으면 그대로 반환
    if (device.label) {
      return device.label;
    }
  }

  // 4. 최후 수단: deviceId 일부 사용
  return `카메라 (${device.deviceId.slice(0, 8)})`;
}

/**
 * Compares two device lists for equality
 *
 * Useful for detecting device changes
 */
export function areDeviceListsEqual(
  a: CameraDevice[],
  b: CameraDevice[]
): boolean {
  if (a.length !== b.length) return false;

  return a.every((deviceA, index) => {
    const deviceB = b[index];
    if (!deviceB) return false;
    return (
      deviceA.deviceId === deviceB.deviceId &&
      deviceA.label === deviceB.label &&
      deviceA.groupId === deviceB.groupId
    );
  });
}

/**
 * Gets the best default camera for barcode scanning
 *
 * Prefers back camera, falls back to any available camera
 */
export function getDefaultCamera(devices: CameraDevice[]): CameraDevice | null {
  if (devices.length === 0) return null;

  // Try to find back camera first
  const backCamera = findBackCamera(devices);
  if (backCamera) return backCamera;

  // Fall back to first available camera
  return devices[0] ?? null;
}
