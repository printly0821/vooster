'use client';

import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCameraError } from '../hooks/useCamera';
import { CameraErrorSeverity } from '../lib/errors';

/**
 * Ensures severity is a valid CameraErrorSeverity enum value
 */
function ensureSeverity(severity: string): CameraErrorSeverity {
  switch (severity) {
    case 'critical':
      return CameraErrorSeverity.CRITICAL;
    case 'recoverable':
      return CameraErrorSeverity.RECOVERABLE;
    case 'warning':
      return CameraErrorSeverity.WARNING;
    case 'info':
      return CameraErrorSeverity.INFO;
    default:
      return CameraErrorSeverity.RECOVERABLE;
  }
}

/**
 * Maps error severity to alert variant
 */
function getSeverityVariant(severity: string | CameraErrorSeverity) {
  const enumSeverity = typeof severity === 'string' ? ensureSeverity(severity) : severity;

  switch (enumSeverity) {
    case CameraErrorSeverity.CRITICAL:
      return 'destructive' as const;
    case CameraErrorSeverity.RECOVERABLE:
      return 'warning' as const;
    case CameraErrorSeverity.WARNING:
      return 'warning' as const;
    case CameraErrorSeverity.INFO:
      return 'info' as const;
    default:
      return 'default' as const;
  }
}

/**
 * Gets appropriate icon for error severity
 */
function getSeverityIcon(severity: string | CameraErrorSeverity) {
  const enumSeverity = typeof severity === 'string' ? ensureSeverity(severity) : severity;

  switch (enumSeverity) {
    case CameraErrorSeverity.CRITICAL:
      return AlertCircle;
    case CameraErrorSeverity.RECOVERABLE:
      return AlertTriangle;
    case CameraErrorSeverity.WARNING:
      return AlertTriangle;
    case CameraErrorSeverity.INFO:
      return Info;
    default:
      return AlertCircle;
  }
}

/**
 * Triggers vibration feedback if supported
 */
function vibrateOnError(severity: string | CameraErrorSeverity) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  const enumSeverity = typeof severity === 'string' ? ensureSeverity(severity) : severity;

  // Different vibration patterns based on severity
  switch (enumSeverity) {
    case CameraErrorSeverity.CRITICAL:
      navigator.vibrate([10, 30, 10, 30, 10]); // Double pulse for critical
      break;
    case CameraErrorSeverity.RECOVERABLE:
    case CameraErrorSeverity.WARNING:
      navigator.vibrate([10, 30, 10]); // Single pulse
      break;
    default:
      // No vibration for info
      break;
  }
}

export interface CameraErrorBannerProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether to show retry button for retryable errors */
  showRetryButton?: boolean;
  /** Custom retry button text */
  retryButtonText?: string;
  /** Callback when error is dismissed */
  onDismiss?: () => void;
  /** Callback when retry is clicked */
  onRetry?: () => void;
}

/**
 * CameraErrorBanner Component
 *
 * Displays camera errors with user-friendly messages and recovery suggestions.
 *
 * Features:
 * - Automatic error detection from camera context
 * - Severity-based styling and icons
 * - Retry functionality for retryable errors
 * - ARIA live region for screen reader announcements
 * - Vibration feedback on error (if supported)
 *
 * @example
 * ```tsx
 * <CameraErrorBanner
 *   showRetryButton
 *   showCloseButton
 *   onDismiss={() => console.log('Error dismissed')}
 * />
 * ```
 */
export function CameraErrorBanner({
  className,
  showCloseButton = true,
  showRetryButton = true,
  retryButtonText = '다시 시도',
  onDismiss,
  onRetry,
}: CameraErrorBannerProps) {
  const { error, clearError, retry, isRetryable } = useCameraError();
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Trigger vibration when error occurs
  React.useEffect(() => {
    if (error) {
      vibrateOnError(error.severity);
    }
  }, [error]);

  // Don't render if no error
  if (!error) return null;

  const variant = getSeverityVariant(error.severity);
  const Icon = getSeverityIcon(error.severity);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retry();
      onRetry?.();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    clearError();
    onDismiss?.();
  };

  return (
    <Alert
      variant={variant}
      className={cn('relative', className)}
      // ARIA live region for screen reader announcements
      aria-live="assertive"
      aria-atomic="true"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />

      <AlertTitle className="flex items-center justify-between gap-2">
        <span>{error.userMessage}</span>
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
            aria-label="오류 메시지 닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>

      <AlertDescription className="space-y-3">
        {/* Technical message (optional, for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs opacity-70 font-mono">
            {error.code} - {error.technicalMessage}
          </div>
        )}

        {/* Recovery suggestions */}
        {error.recoverySuggestions.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium text-sm">해결 방법:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {error.recoverySuggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Retry button */}
        {showRetryButton && isRetryable && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              <RefreshCw
                className={cn('h-4 w-4', isRetrying && 'animate-spin')}
              />
              {isRetrying ? '재시도 중...' : retryButtonText}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
