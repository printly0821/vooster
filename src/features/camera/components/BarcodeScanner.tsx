/**
 * BarcodeScanner UI Component
 *
 * Provides visual overlay for barcode scanning with:
 * - Scan guide frame with animated scanning line
 * - Success/error feedback animations
 * - Torch toggle button (when supported)
 * - Accessible UI with WCAG 2.1 AA compliance
 *
 * @module features/camera/components/BarcodeScanner
 *
 * @example
 * ```tsx
 * <BarcodeScanner
 *   stream={cameraStream}
 *   videoElement={videoRef.current}
 *   onScan={(result) => console.log('Scanned:', result.text)}
 *   showTorchToggle
 *   showScanGuide
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { Zap, ZapOff, Scan, CheckCircle2, XCircle, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBarcodeScanner, useCameraTorch, useCameraFocus } from '../hooks';
import type { BarcodeResult, BarcodeScannerConfig, CameraError } from '../types';
import { BARCODE_SUCCESS_HIGHLIGHT_DURATION_MS } from '../constants';

/**
 * Props for BarcodeScanner component
 */
export interface BarcodeScannerProps {
  /** Active camera stream from useCamera or useCameraStream */
  stream: MediaStream | null;

  /** Video element displaying the camera feed */
  videoElement: HTMLVideoElement | null;

  /** Scanner configuration options */
  config?: BarcodeScannerConfig;

  /** Additional CSS classes for the container */
  className?: string;

  /** Whether to show torch (flashlight) toggle button */
  showTorchToggle?: boolean;

  /** Whether to show manual focus button */
  showFocusButton?: boolean;

  /** Whether to show scan guide overlay with frame */
  showScanGuide?: boolean;

  /** Callback when barcode is successfully detected */
  onScan?: (result: BarcodeResult) => void;

  /** Callback when scanner error occurs */
  onError?: (error: CameraError) => void;
}

/**
 * BarcodeScanner Component
 *
 * Provides a complete UI overlay for barcode scanning with visual feedback,
 * scan guide frame, torch control, and error handling.
 *
 * Features:
 * - Animated scan guide with corner markers
 * - Success feedback with green highlight
 * - Torch toggle button (when supported)
 * - Error banner display
 * - Temporary success notification
 * - Responsive design for all screen sizes
 * - WCAG 2.1 AA compliant with aria-labels
 *
 * @performance
 * - Optimized rendering with React.memo on callbacks
 * - Efficient DOM updates with conditional rendering
 * - CSS animations instead of JS-based animations
 *
 * @accessibility
 * - Screen reader friendly with aria-labels
 * - High contrast visual indicators
 * - Keyboard accessible controls
 */
export function BarcodeScanner({
  stream,
  videoElement,
  config,
  className,
  showTorchToggle = true,
  showFocusButton = true,
  showScanGuide = true,
  onScan,
  onError,
}: BarcodeScannerProps) {
  // UI state
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [lastScannedText, setLastScannedText] = React.useState<string>('');
  const [isFocusing, setIsFocusing] = React.useState(false);

  // Barcode scanner hook with success feedback
  const {
    isScanning,
    isPaused,
    lastResult,
    error: scanError,
    startScanning,
    stopScanning,
  } = useBarcodeScanner(stream, videoElement, {
    ...config,
    onDetected: React.useCallback(
      (result: BarcodeResult) => {
        // Show success feedback animation
        setShowSuccess(true);
        setLastScannedText(result.text);

        // Hide success feedback after duration
        setTimeout(() => {
          setShowSuccess(false);
        }, BARCODE_SUCCESS_HIGHLIGHT_DURATION_MS);

        // Call parent callbacks
        onScan?.(result);
        config?.onDetected?.(result);
      },
      [onScan, config]
    ),
    onError: React.useCallback(
      (error: CameraError) => {
        onError?.(error);
        config?.onError?.(error);
      },
      [onError, config]
    ),
  });

  // Torch control hook
  const { torchCapability, toggleTorch } = useCameraTorch(stream);

  // Focus control hook
  const { focusCapability, triggerFocus } = useCameraFocus(stream);

  // Debug: Log focus capability
  React.useEffect(() => {
    if (focusCapability) {
      console.log('🔍 Focus Capability:', {
        supportsManualFocus: focusCapability.supportsManualFocus,
        supportsContinuousFocus: focusCapability.supportsContinuousFocus,
        focusModes: focusCapability.focusModes,
        currentMode: focusCapability.currentMode,
      });
    }
  }, [focusCapability]);

  // Handle manual focus trigger
  const handleFocusTrigger = React.useCallback(async () => {
    if (!focusCapability.supportsManualFocus) {
      console.warn('⚠️ Manual focus not supported on this device');
      return;
    }

    setIsFocusing(true);
    console.log('📸 Triggering manual focus...');
    try {
      await triggerFocus();
      console.log('✅ Focus trigger completed');
    } catch (error) {
      console.error('❌ Focus trigger failed:', error);
    } finally {
      // Show focusing state briefly
      setTimeout(() => {
        setIsFocusing(false);
      }, 500);
    }
  }, [triggerFocus, focusCapability]);

  // Auto-start scanning when stream and video are ready
  // Track if scanning has been started to prevent double-start
  // Event-driven approach: Start scanning when stream and video are available
  React.useEffect(() => {
    // Early return if conditions not met
    if (!stream || !videoElement) {
      console.log('⏸️ BarcodeScanner: Stream or video not ready', {
        hasStream: !!stream,
        hasVideo: !!videoElement,
      });
      return;
    }

    console.log('🎯 BarcodeScanner: Starting scan');

    // AbortController for proper cancellation
    const abortController = new AbortController();

    // Start scanning asynchronously with abort signal
    startScanning(abortController.signal)
      .then(() => {
        if (!abortController.signal.aborted) {
          console.log('✅ BarcodeScanner: Scan started successfully');
        }
      })
      .catch((err) => {
        // Ignore abort-related errors (normal cancellation)
        if (err instanceof Error && !err.message.includes('aborted')) {
          console.error('❌ BarcodeScanner: Scan start failed:', err);
        }
      });

    // Cleanup: abort ongoing operation and stop scanning
    return () => {
      console.log('🧹 BarcodeScanner: Cleanup (unmount or dependency change)');
      abortController.abort();
      stopScanning();
    };
  }, [stream, videoElement, startScanning, stopScanning]);

  // Don't render anything if stream or videoElement is missing
  if (!stream || !videoElement) {
    return null;
  }

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Scan Guide Overlay */}
      {showScanGuide && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Dark overlay with center cutout */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Center scan frame container */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div
              className={cn(
                'relative w-full max-w-sm aspect-square',
                'border-4 rounded-2xl transition-all duration-300',
                showSuccess
                  ? 'border-green-500 shadow-lg shadow-green-500/50'
                  : 'border-white/80 shadow-lg'
              )}
              role="img"
              aria-label="바코드 스캔 가이드 프레임"
            >
              {/* Corner markers for visual guide */}
              <div
                className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"
                aria-hidden="true"
              />
              <div
                className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"
                aria-hidden="true"
              />

              {/* Animated scanning line */}
              {isScanning && !isPaused && !showSuccess && (
                <div
                  className="absolute inset-0 overflow-hidden rounded-xl"
                  aria-hidden="true"
                >
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan" />
                </div>
              )}
            </div>
          </div>

          {/* Instruction text */}
          <div
            className="absolute bottom-24 inset-x-0 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-white text-sm font-medium drop-shadow-lg">
              {showSuccess ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" aria-hidden="true" />
                  스캔 완료!
                </span>
              ) : isPaused ? (
                <span className="flex items-center justify-center gap-2">
                  <Scan className="w-5 h-5" aria-hidden="true" />
                  일시 정지됨
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Scan className="w-5 h-5 animate-pulse" aria-hidden="true" />
                  바코드를 프레임 안에 맞춰주세요
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Control Buttons (Torch, Focus) */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {/* Focus Button - Always show when enabled, disable if not supported */}
        {showFocusButton && (
          <Button
            variant="secondary"
            size="icon"
            onClick={handleFocusTrigger}
            disabled={isFocusing || !focusCapability.supportsManualFocus}
            className={cn(
              'rounded-full shadow-lg transition-all duration-200',
              isFocusing
                ? 'bg-blue-500 text-white scale-110'
                : focusCapability.supportsManualFocus
                ? 'bg-white/90 hover:bg-white'
                : 'bg-gray-300/60 cursor-not-allowed'
            )}
            aria-label={
              focusCapability.supportsManualFocus
                ? '포커스 맞추기'
                : '포커스 기능 미지원'
            }
            aria-busy={isFocusing}
            title={
              focusCapability.supportsManualFocus
                ? '탭하여 포커스 재조정'
                : '이 기기는 수동 포커스를 지원하지 않습니다'
            }
          >
            <Focus
              className={cn(
                'w-5 h-5 transition-transform',
                isFocusing && 'animate-pulse scale-110'
              )}
              aria-hidden="true"
            />
          </Button>
        )}

        {/* Torch Toggle Button */}
        {showTorchToggle && torchCapability.isSupported && (
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleTorch}
            className={cn(
              'rounded-full shadow-lg transition-colors duration-200',
              torchCapability.isEnabled
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-white/90 hover:bg-white'
            )}
            aria-label={torchCapability.isEnabled ? 'Torch 끄기' : 'Torch 켜기'}
            aria-pressed={torchCapability.isEnabled}
          >
            {torchCapability.isEnabled ? (
              <Zap className="w-5 h-5" aria-hidden="true" />
            ) : (
              <ZapOff className="w-5 h-5" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>

      {/* Error Display Banner */}
      {scanError && (
        <div
          className="absolute bottom-4 inset-x-4 z-20"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium text-sm">스캔 오류</p>
              <p className="text-xs opacity-90">
                {scanError instanceof Error ? scanError.message : '알 수 없는 오류가 발생했습니다.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Result Display (temporary) */}
      {showSuccess && lastScannedText && (
        <div
          className="absolute top-4 left-4 right-4 z-20"
          role="status"
          aria-live="polite"
        >
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">스캔 성공</p>
              <p className="text-xs opacity-90 truncate" title={lastScannedText}>
                {lastScannedText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Display name for React DevTools
BarcodeScanner.displayName = 'BarcodeScanner';
