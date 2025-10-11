'use client';

import * as React from 'react';
import { Camera, Smartphone, Video } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCameraActions, useCameraState } from '../hooks/useCamera';

const DEVICE_STORAGE_KEY = 'camera-selected-device-id';

export interface CameraDeviceSelectorProps {
  /** Additional CSS classes */
  className?: string;
  /** Custom placeholder text */
  placeholder?: string;
  /** Whether to remember last selected device */
  rememberDevice?: boolean;
  /** Callback when device is selected */
  onDeviceSelect?: (deviceId: string) => void;
}

/**
 * Gets icon for camera device based on label
 */
function getDeviceIcon(label: string): React.ComponentType<{ className?: string }> {
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.includes('front') || lowerLabel.includes('전면')) {
    return Smartphone;
  }
  if (lowerLabel.includes('back') || lowerLabel.includes('rear') || lowerLabel.includes('후면')) {
    return Camera;
  }

  return Video;
}

/**
 * Gets display label for camera device
 */
function getDeviceDisplayLabel(label: string, index: number): string {
  if (!label || label === '') {
    return `카메라 ${index + 1}`;
  }

  // Clean up common device labels
  const cleanLabel = label
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  return cleanLabel || `카메라 ${index + 1}`;
}

/**
 * CameraDeviceSelector Component
 *
 * Dropdown selector for choosing camera device.
 *
 * Features:
 * - Shows device labels with appropriate icons
 * - Keyboard navigable (arrow keys, Enter)
 * - Remembers last selected device in localStorage
 * - Accessible with proper ARIA labels
 * - Auto-selects on initial load if remembered
 *
 * @example
 * ```tsx
 * <CameraDeviceSelector
 *   rememberDevice
 *   onDeviceSelect={(deviceId) => console.log('Selected:', deviceId)}
 * />
 * ```
 */
export function CameraDeviceSelector({
  className,
  placeholder = '카메라를 선택하세요',
  rememberDevice = true,
  onDeviceSelect,
}: CameraDeviceSelectorProps) {
  const { devices, selectedDevice, permissionState } = useCameraState();
  const { selectDevice } = useCameraActions();

  const handleDeviceChange = React.useCallback((deviceId: string) => {
    selectDevice(deviceId);

    // Remember device selection
    if (rememberDevice) {
      try {
        localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
      } catch (error) {
        console.warn('Failed to save device preference:', error);
      }
    }

    onDeviceSelect?.(deviceId);
  }, [selectDevice, rememberDevice, onDeviceSelect]);

  // Load remembered device on mount
  React.useEffect(() => {
    if (!rememberDevice || devices.length === 0 || selectedDevice) return;

    try {
      const rememberedDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (rememberedDeviceId) {
        const deviceExists = devices.some(
          (device) => device.deviceId === rememberedDeviceId
        );

        if (deviceExists) {
          selectDevice(rememberedDeviceId);
        }
      }
    } catch (error) {
      console.warn('Failed to load remembered device:', error);
    }
  }, [devices, selectedDevice, selectDevice, rememberDevice]);

  // Auto-select if only one device - ALWAYS call this hook
  React.useEffect(() => {
    if (devices.length === 1 && !selectedDevice) {
      handleDeviceChange(devices[0].deviceId);
    }
  }, [devices.length, selectedDevice, handleDeviceChange]);

  // Calculate visibility - don't use early returns
  const shouldShow = permissionState === 'granted' && devices.length > 1;

  if (!shouldShow) {
    return null;
  }

  return (
    <Select
      value={selectedDevice?.deviceId || ''}
      onValueChange={handleDeviceChange}
    >
      <SelectTrigger
        className={cn('w-full', className)}
        aria-label="카메라 선택"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {devices.map((device, index) => {
          const Icon = getDeviceIcon(device.label);
          const displayLabel = getDeviceDisplayLabel(device.label, index);

          return (
            <SelectItem
              key={device.deviceId}
              value={device.deviceId}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{displayLabel}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * Hook to clear remembered device selection
 */
export function useClearRememberedDevice() {
  return React.useCallback(() => {
    try {
      localStorage.removeItem(DEVICE_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear remembered device:', error);
    }
  }, []);
}
