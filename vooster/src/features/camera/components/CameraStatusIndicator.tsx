'use client';

import * as React from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Loader2,
  Lock,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCameraState } from '../hooks/useCamera';

export type CameraStatus =
  | 'idle'
  | 'checking-permission'
  | 'permission-denied'
  | 'enumerating-devices'
  | 'ready'
  | 'streaming'
  | 'error';

export interface CameraStatusIndicatorProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show status text */
  showText?: boolean;
  /** Custom status text mapping */
  statusText?: Partial<Record<CameraStatus, string>>;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to animate the indicator */
  animate?: boolean;
}

const defaultStatusText: Record<CameraStatus, string> = {
  idle: '대기 중',
  'checking-permission': '권한 확인 중',
  'permission-denied': '권한 거부됨',
  'enumerating-devices': '카메라 목록 확인 중',
  ready: '준비 완료',
  streaming: '카메라 활성',
  error: '오류 발생',
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * Determines current camera status from context
 */
function useCameraStatus(): CameraStatus {
  const {
    permissionState,
    isCheckingPermission,
    isEnumeratingDevices,
    selectedDevice,
    isStreamActive,
    error,
  } = useCameraState();

  return React.useMemo(() => {
    if (error) return 'error';
    if (isCheckingPermission) return 'checking-permission';
    if (permissionState === 'denied') return 'permission-denied';
    if (isEnumeratingDevices) return 'enumerating-devices';
    if (isStreamActive) return 'streaming';
    if (permissionState === 'granted' && selectedDevice) return 'ready';
    return 'idle';
  }, [
    error,
    isCheckingPermission,
    permissionState,
    isEnumeratingDevices,
    isStreamActive,
    selectedDevice,
  ]);
}

/**
 * Gets icon component for status
 */
function getStatusIcon(status: CameraStatus) {
  switch (status) {
    case 'checking-permission':
    case 'enumerating-devices':
      return Loader2;
    case 'permission-denied':
      return Lock;
    case 'ready':
      return CheckCircle;
    case 'streaming':
      return Camera;
    case 'error':
      return AlertCircle;
    default:
      return Camera;
  }
}

/**
 * Gets color classes for status
 */
function getStatusColor(status: CameraStatus): string {
  switch (status) {
    case 'checking-permission':
    case 'enumerating-devices':
      return 'text-blue-500';
    case 'permission-denied':
      return 'text-yellow-500';
    case 'ready':
      return 'text-green-500';
    case 'streaming':
      return 'text-green-600';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Gets ARIA label for status
 */
function getStatusAriaLabel(status: CameraStatus, statusText: string): string {
  return `카메라 상태: ${statusText}`;
}

/**
 * CameraStatusIndicator Component
 *
 * Visual indicator of current camera status.
 *
 * Features:
 * - Automatic status detection from camera context
 * - Loading spinner during initialization
 * - Success/error icons with appropriate colors
 * - ARIA status announcements for screen readers
 * - Configurable size and text display
 *
 * @example
 * ```tsx
 * <CameraStatusIndicator
 *   showText
 *   size="md"
 *   animate
 * />
 * ```
 */
export function CameraStatusIndicator({
  className,
  showText = true,
  statusText: customStatusText,
  size = 'md',
  animate = true,
}: CameraStatusIndicatorProps) {
  const status = useCameraStatus();
  const [previousStatus, setPreviousStatus] = React.useState(status);

  // Track status changes for announcements
  React.useEffect(() => {
    if (status !== previousStatus) {
      setPreviousStatus(status);
    }
  }, [status, previousStatus]);

  const Icon = getStatusIcon(status);
  const colorClass = getStatusColor(status);
  const sizeClass = sizeClasses[size];

  const statusTextMap = {
    ...defaultStatusText,
    ...customStatusText,
  };

  const displayText = statusTextMap[status];
  const ariaLabel = getStatusAriaLabel(status, displayText);

  const isLoading =
    status === 'checking-permission' || status === 'enumerating-devices';

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaLabel}
    >
      <Icon
        className={cn(
          sizeClass,
          colorClass,
          animate && isLoading && 'animate-spin'
        )}
        aria-hidden="true"
      />
      {showText && (
        <span className={cn('text-sm font-medium', colorClass)}>
          {displayText}
        </span>
      )}
    </div>
  );
}

/**
 * Compact status badge variant
 */
export interface CameraStatusBadgeProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show as a dot indicator */
  dotOnly?: boolean;
}

export function CameraStatusBadge({
  className,
  dotOnly = false,
}: CameraStatusBadgeProps) {
  const status = useCameraStatus();
  const colorClass = getStatusColor(status);

  if (dotOnly) {
    return (
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          colorClass.replace('text-', 'bg-'),
          className
        )}
        role="status"
        aria-label={`카메라 상태: ${defaultStatusText[status]}`}
      />
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        colorClass,
        className
      )}
      role="status"
      aria-label={`카메라 상태: ${defaultStatusText[status]}`}
    >
      <div
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          colorClass.replace('text-', 'bg-')
        )}
        aria-hidden="true"
      />
      <span>{defaultStatusText[status]}</span>
    </div>
  );
}
