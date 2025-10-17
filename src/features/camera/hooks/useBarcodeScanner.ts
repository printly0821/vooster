/**
 * Barcode scanner hook using @zxing/browser
 *
 * Provides continuous barcode scanning capabilities with duplicate prevention,
 * pause/resume functionality, and haptic feedback.
 *
 * @module features/camera/hooks/useBarcodeScanner
 *
 * @example
 * ```tsx
 * const { isScanning, lastResult, startScanning, pauseScanning } = useBarcodeScanner(
 *   stream,
 *   videoRef.current,
 *   {
 *     onDetected: (result) => {
 *       console.log('Scanned:', result.text);
 *     },
 *     cooldownMs: 1500,
 *   }
 * );
 * ```
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import type { Result } from '@zxing/library';
import type { BarcodeResult, BarcodeScannerConfig } from '../types';
import { BARCODE_SCAN_COOLDOWN_MS, BARCODE_VIBRATION_PATTERN } from '../constants';
import { globalZXingReader, initializeGlobalZXingReader } from '../context/CameraProvider';

/**
 * Scanner controls interface returned by ZXing's decodeFromStream
 *
 * Provides methods to control the active scanning session.
 */
interface IScannerControls {
  /** Stop the scanning session and release resources */
  stop(): void;
}

/**
 * Return type for the useBarcodeScanner hook
 */
export interface UseBarcodeScannerReturn {
  /** Whether barcode scanning is currently active */
  readonly isScanning: boolean;

  /** Whether scanning is temporarily paused */
  readonly isPaused: boolean;

  /** Last successfully scanned barcode result */
  readonly lastResult: BarcodeResult | null;

  /** Current scanner error if any */
  readonly error: Error | null;

  /**
   * Start barcode scanning
   *
   * Initializes the ZXing reader and begins continuous barcode decoding.
   * Will use the provided MediaStream and video element.
   *
   * @param abortSignal - Optional AbortSignal to cancel the scanning operation
   * @throws {Error} If stream or videoElement is not available
   */
  startScanning: (abortSignal?: AbortSignal) => Promise<void>;

  /**
   * Stop barcode scanning
   *
   * Stops the ZXing reader and cleans up resources.
   * Can be safely called multiple times.
   */
  stopScanning: () => void;

  /**
   * Pause barcode scanning
   *
   * Temporarily pauses barcode detection without stopping the decoder.
   * Useful for preventing unwanted scans during UI interactions.
   */
  pauseScanning: () => void;

  /**
   * Resume barcode scanning
   *
   * Resumes barcode detection after being paused.
   */
  resumeScanning: () => void;
}

/**
 * Internal state for tracking last detection to prevent duplicates
 */
interface LastDetection {
  text: string;
  timestamp: number;
}

/**
 * Custom hook for barcode scanning with duplicate prevention and pause/resume
 *
 * @param stream - Active MediaStream from camera
 * @param videoElement - Video element displaying the camera feed
 * @param config - Optional configuration for scanner behavior
 *
 * @returns Scanner state and control functions
 *
 * @remarks
 * This hook uses BrowserMultiFormatReader from @zxing/browser to continuously
 * decode barcodes from the camera stream. It includes built-in duplicate prevention
 * to avoid scanning the same barcode multiple times within a cooldown period.
 *
 * The hook automatically provides haptic feedback (vibration) on supported devices
 * when a barcode is successfully detected.
 *
 * @performance
 * Target decode time: < 250ms per frame
 * Memory: ~5MB for ZXing reader instance
 *
 * @see https://github.com/zxing-js/browser
 */
export function useBarcodeScanner(
  stream: MediaStream | null,
  videoElement: HTMLVideoElement | null,
  config?: BarcodeScannerConfig
): UseBarcodeScannerReturn {
  // State
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastResult, setLastResult] = useState<BarcodeResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for stable references across renders
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const readerInitializedRef = useRef(false); // Track if ZXing reader has been initialized
  const lastDetectionRef = useRef<LastDetection>({
    text: '',
    timestamp: 0,
  });
  const isMountedRef = useRef(true);
  const scanningControlRef = useRef<IScannerControls | null>(null);

  /**
   * Check if the detected barcode is a duplicate within cooldown period
   *
   * @param text - Decoded barcode text
   * @returns true if this is a duplicate detection, false otherwise
   */
  const isDuplicate = useCallback(
    (text: string): boolean => {
      const now = Date.now();
      const cooldown = config?.cooldownMs ?? BARCODE_SCAN_COOLDOWN_MS;

      if (
        lastDetectionRef.current.text === text &&
        now - lastDetectionRef.current.timestamp < cooldown
      ) {
        return true;
      }

      return false;
    },
    [config?.cooldownMs]
  );

  /**
   * Handle barcode detection from ZXing reader
   *
   * Processes the decoded result, checks for duplicates, provides feedback,
   * and invokes the onDetected callback.
   *
   * @param result - ZXing Result object containing decoded barcode data
   */
  const handleDetected = useCallback(
    (result: Result) => {
      if (!result || isPaused) return;

      const text = result.getText();

      // Check for duplicate within cooldown period
      if (isDuplicate(text)) {
        console.log('🔄 중복 스캔 무시:', text);
        return;
      }

      // Create barcode result object
      const barcodeResult: BarcodeResult = {
        text,
        format: result.getBarcodeFormat().toString(),
        timestamp: Date.now(),
      };

      // Provide haptic feedback on supported devices
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([...BARCODE_VIBRATION_PATTERN]);
      }

      // Update last detection record for duplicate prevention
      lastDetectionRef.current = {
        text,
        timestamp: barcodeResult.timestamp,
      };

      // Update state if component is still mounted
      if (isMountedRef.current) {
        setLastResult(barcodeResult);
      }

      // Invoke callback
      config?.onDetected?.(barcodeResult);

      console.log('✅ 바코드 감지:', barcodeResult);
    },
    [isPaused, isDuplicate, config]
  );

  // Track if video has been successfully validated once
  const videoReadyRef = useRef(false);

  /**
   * Wait for video element to be ready for scanning
   *
   * @param video - Video element to check
   * @returns Promise that resolves when video is ready
   */
  const waitForVideoReady = useCallback(
    (video: HTMLVideoElement): Promise<void> => {
      return new Promise((resolve, reject) => {
        // If already validated once, skip re-validation
        if (videoReadyRef.current) {
          console.log('✅ 비디오 이미 검증됨 (캐시 사용)');
          resolve();
          return;
        }

        let intervalId: NodeJS.Timeout | null = null;
        let timeoutId: NodeJS.Timeout | null = null;

        const cleanup = () => {
          if (intervalId) clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
          video.removeEventListener('loadeddata', checkReady);
          video.removeEventListener('loadedmetadata', checkReady);
          video.removeEventListener('canplay', checkReady);
          video.removeEventListener('playing', checkReady);
        };

        // Check if video is already ready
        // Progressive: Use HAVE_METADATA for faster initialization (instead of HAVE_CURRENT_DATA)
        // HAVE_METADATA (1) = duration and dimensions available
        // HAVE_CURRENT_DATA (2) = data available for current time
        const isVideoReady = () => {
          return (
            video.readyState >= video.HAVE_METADATA &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
            // Performance: HAVE_METADATA is sufficient for barcode scanning
          );
        };

        if (isVideoReady()) {
          console.log('✅ 비디오 이미 준비됨:', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
          });
          videoReadyRef.current = true;
          resolve();
          return;
        }

        console.log('⏳ 비디오 준비 대기 중... (초기 상태:', {
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState,
          paused: video.paused,
          srcObject: !!video.srcObject,
        }, ')');

        // Set up timeout (reduced from 15s to 5s for faster failure detection)
        timeoutId = setTimeout(() => {
          cleanup();
          console.error('❌ 비디오 준비 타임아웃 (5초):', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
            readyStateText: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][video.readyState],
            srcObject: !!video.srcObject,
            networkState: video.networkState,
            networkStateText: ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'][video.networkState],
            error: video.error ? { code: video.error.code, message: video.error.message } : null,
            currentTime: video.currentTime,
          });
          reject(new Error('Video element failed to become ready within 5 seconds'));
        }, 5000);  // Optimized: 15000ms → 5000ms (3배 단축)

        // Wait for video to be ready
        const checkReady = () => {
          if (isVideoReady()) {
            cleanup();
            console.log('✅ 비디오 준비 완료:', {
              width: video.videoWidth,
              height: video.videoHeight,
              readyState: video.readyState,
            });
            videoReadyRef.current = true;
            resolve();
          }
        };

        // Listen to multiple events
        video.addEventListener('loadeddata', checkReady);
        video.addEventListener('loadedmetadata', checkReady);
        video.addEventListener('canplay', checkReady);
        video.addEventListener('playing', checkReady);

        // Check periodically (every 100ms)
        intervalId = setInterval(checkReady, 100);
      });
    },
    []
  );

  /**
   * Start barcode scanning
   *
   * Initializes the ZXing BrowserMultiFormatReader with optimized hints
   * and begins continuous barcode decoding from the camera stream.
   *
   * @param abortSignal - Optional AbortSignal to cancel the scanning operation
   * @throws {Error} If stream or videoElement is not available
   *
   * @remarks
   * - Uses TRY_HARDER hint for improved recognition of blurry/angled barcodes
   * - Waits for video element to be fully ready before starting
   * - Supports AbortController for proper async cancellation
   * - Recommended camera resolution: 1920x1080 for small barcodes
   */
  const startScanning = useCallback(async (abortSignal?: AbortSignal) => {
    if (!stream || !videoElement || isScanning) return;

    try {
      console.log('🎯 바코드 스캔 시작');

      // Check abort before async operation
      if (abortSignal?.aborted) {
        throw new Error('Scan aborted before video ready check');
      }

      // Wait for video to be ready
      console.log('⏳ 비디오 준비 대기 중...');
      await waitForVideoReady(videoElement);

      // Check abort after video ready
      if (abortSignal?.aborted) {
        throw new Error('Scan aborted after video ready');
      }

      console.log('✅ 비디오 준비 완료:', {
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        readyState: videoElement.readyState,
      });

      // Use pre-initialized global ZXing reader (Performance: 200-500ms saved)
      if (!readerInitializedRef.current) {
        // Try to use global pre-initialized reader first
        if (globalZXingReader) {
          readerRef.current = globalZXingReader;
          console.log('♻️ 전역 ZXing 리더 사용 (사전 초기화됨)');
        } else {
          // Fallback: Initialize local reader if global not available
          const hints = new Map();
          hints.set(DecodeHintType.TRY_HARDER, true);
          readerRef.current = initializeGlobalZXingReader() || new BrowserMultiFormatReader(hints);
          console.log('🔧 ZXing 리더 초기화 (Fallback)');
        }
        readerInitializedRef.current = true;
      }

      // Check abort before decodeFromStream
      if (abortSignal?.aborted) {
        throw new Error('Scan aborted before decodeFromStream');
      }

      const reader = readerRef.current;
      if (!reader) {
        throw new Error('Scanner reader not initialized');
      }

      // Start continuous decode from camera stream with optimized timing
      // Uses requestAnimationFrame internally for ~60fps scanning
      const controls = await reader.decodeFromStream(
        stream,
        videoElement,
        (result, error) => {
          if (result) {
            handleDetected(result);
          }
          // NotFoundException is normal when no barcode is in frame
          if (error && error.name !== 'NotFoundException') {
            console.error('바코드 디코드 에러:', error);
          }
        }
      );

      // Register abort listener to stop controls
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          console.log('🛑 Scan aborted - stopping controls');
          controls?.stop();
        });
      }

      scanningControlRef.current = controls;

      // Update state if component is still mounted and not aborted
      if (isMountedRef.current && !abortSignal?.aborted) {
        setIsScanning(true);
        setIsPaused(false);
        setError(null);
      }
    } catch (err) {
      // Check if error is due to abort (normal cancellation)
      if (err instanceof Error && err.message.includes('aborted')) {
        console.log('⏹️ Scan aborted (normal):', err.message);
        return; // Not an error, just cancelled
      }

      // 에러 유형 분류
      let errorType = 'UNKNOWN';
      let userMessage = '바코드 스캔을 시작할 수 없습니다.';
      let suggestions: string[] = [];

      if (err instanceof Error) {
        if (err.message.includes('Video element failed to become ready')) {
          errorType = 'VIDEO_TIMEOUT';
          userMessage = '카메라 준비 시간이 초과되었습니다.';
          suggestions = [
            '앱을 다시 시작해주세요.',
            '카메라 권한을 확인해주세요.',
            '다른 앱에서 카메라를 사용 중인지 확인해주세요.',
          ];
        } else if (err.message.includes('stream')) {
          errorType = 'STREAM_ERROR';
          userMessage = '카메라 스트림 연결에 실패했습니다.';
          suggestions = [
            '카메라 권한을 다시 허용해주세요.',
            '디바이스를 재시작해보세요.',
          ];
        }
      }

      console.error('❌ 바코드 스캔 시작 실패:', {
        errorType,
        errorMessage: err instanceof Error ? err.message : String(err),
        userMessage,
        suggestions,
        stack: err instanceof Error ? err.stack : undefined,
      });

      if (isMountedRef.current) {
        setError(err as Error);
      }

      // Invoke error callback if provided
      config?.onError?.(err as any);
    }
  }, [stream, videoElement, isScanning, handleDetected, config, waitForVideoReady]);

  /**
   * Stop barcode scanning
   *
   * Stops the ZXing reader, cleans up resources, and resets scanning state.
   * Safe to call multiple times.
   */
  const stopScanning = useCallback(() => {
    console.log('⏹️ 바코드 스캔 중지');

    // Stop the decoder controls
    if (scanningControlRef.current) {
      scanningControlRef.current.stop();
      scanningControlRef.current = null;
    }

    // Performance fix: Reset videoReadyRef cache to prevent stale state
    // Issue: videoReadyRef persisted across scan cycles causing video ready check to be skipped
    // Solution: Reset to false so next scan session performs proper video validation
    videoReadyRef.current = false;
    console.log('🔄 videoReadyRef 리셋 (다음 스캔 시 정상 동작)');

    // Note: BrowserMultiFormatReader doesn't have a reset() method
    // The reader instance is reusable and will be properly cleaned up
    // when the component unmounts or when a new scan session starts

    // Update state if component is still mounted
    if (isMountedRef.current) {
      setIsScanning(false);
      setIsPaused(false);
    }
  }, []);

  /**
   * Pause barcode scanning
   *
   * Temporarily pauses barcode detection without stopping the decoder.
   * Detected barcodes will be ignored until resumeScanning is called.
   */
  const pauseScanning = useCallback(() => {
    console.log('⏸️ 바코드 스캔 일시 중지');
    if (isMountedRef.current) {
      setIsPaused(true);
    }
  }, []);

  /**
   * Resume barcode scanning
   *
   * Resumes barcode detection after being paused.
   * The decoder continues running in the background during pause.
   */
  const resumeScanning = useCallback(() => {
    console.log('▶️ 바코드 스캔 재개');
    if (isMountedRef.current) {
      setIsPaused(false);
    }
  }, []);

  /**
   * Cleanup on unmount
   *
   * Ensures proper cleanup of ZXing reader and prevents state updates
   * after component unmount.
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isScanning,
    isPaused,
    lastResult,
    error,
    startScanning,
    stopScanning,
    pauseScanning,
    resumeScanning,
  };
}
