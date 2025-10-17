/**
 * Camera devices hook
 *
 * Handles device enumeration, selection, and persistence
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { CameraDevice, CameraPermissionState } from '../types';
import {
  hasEnumerateDevices,
  filterVideoDevices,
  mediaDeviceInfoToCameraDevice,
  findDeviceById,
  getDefaultCamera,
  mapNativeErrorToCameraError,
  createDeviceEnumerationError,
} from '../lib';
import { LAST_DEVICE_ID_STORAGE_KEY } from '../constants';
import type { CameraError } from '../lib/errors';

/**
 * Hook for managing camera devices
 *
 * @param permissionState - Current permission state
 * @returns Device list, selected device, and management functions
 */
export function useCameraDevices(permissionState: CameraPermissionState) {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<CameraDevice | null>(
    null
  );
  const [isEnumeratingDevices, setIsEnumeratingDevices] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);

  /**
   * Get saved device ID from localStorage
   */
  const getSavedDeviceId = useCallback((): string | null => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      return localStorage.getItem(LAST_DEVICE_ID_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  /**
   * Save device ID to localStorage
   */
  const saveDeviceId = useCallback((deviceId: string): void => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem(LAST_DEVICE_ID_STORAGE_KEY, deviceId);
    } catch {
      // Ignore storage errors
    }
  }, []);

  /**
   * Enumerate available camera devices
   */
  const enumerateDevices = useCallback(async (): Promise<CameraDevice[]> => {
    if (!hasEnumerateDevices()) {
      const error = createDeviceEnumerationError(
        new Error('enumerateDevices not supported')
      );
      setError(error);
      return [];
    }

    setIsEnumeratingDevices(true);
    setError(null);

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = filterVideoDevices(allDevices);

      const cameraDevices = videoDevices.map((device) =>
        mediaDeviceInfoToCameraDevice(device, false)
      );

      setDevices(cameraDevices);

      // Auto-select device if none selected
      if (!selectedDevice && cameraDevices.length > 0) {
        const savedDeviceId = getSavedDeviceId();
        let deviceToSelect: CameraDevice | null = null;

        if (savedDeviceId) {
          deviceToSelect = findDeviceById(cameraDevices, savedDeviceId);
        }

        if (!deviceToSelect) {
          deviceToSelect = getDefaultCamera(cameraDevices);
        }

        if (deviceToSelect) {
          setSelectedDevice(deviceToSelect);
          saveDeviceId(deviceToSelect.deviceId);
        }
      }

      return cameraDevices;
    } catch (err) {
      const cameraError = mapNativeErrorToCameraError(
        err,
        'device enumeration'
      );
      setError(cameraError);
      return [];
    } finally {
      setIsEnumeratingDevices(false);
    }
  }, [selectedDevice, getSavedDeviceId, saveDeviceId]);

  /**
   * Select a specific camera device
   */
  const selectDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      const device = findDeviceById(devices, deviceId);

      if (!device) {
        const error = createDeviceEnumerationError(
          new Error(`Device not found: ${deviceId}`)
        );
        setError(error);
        return;
      }

      setSelectedDevice(device);
      saveDeviceId(deviceId);

      // Update active state in devices array
      setDevices((prev) =>
        prev.map((d) => ({
          ...d,
          isActive: d.deviceId === deviceId,
        }))
      );
    },
    [devices, saveDeviceId]
  );

  /**
   * Listen for device changes
   */
  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      permissionState !== 'granted'
    ) {
      return;
    }

    const handleDeviceChange = () => {
      // Re-enumerate devices when device list changes
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange
      );
    };
  }, [permissionState, enumerateDevices]);

  /**
   * Auto-enumerate devices when permission is granted
   */
  useEffect(() => {
    if (permissionState === 'granted' && devices.length === 0) {
      enumerateDevices();
    }
  }, [permissionState, devices.length, enumerateDevices]);

  return {
    devices,
    selectedDevice,
    isEnumeratingDevices,
    error,
    enumerateDevices,
    selectDevice,
  };
}
