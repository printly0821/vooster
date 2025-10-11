/**
 * Camera stream hook
 *
 * Handles MediaStream lifecycle, visibility API integration, and cleanup
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CameraDevice } from '../types';
import {
  getRecommendedConstraints,
  mapNativeErrorToCameraError,
  isIOS,
  isSafari,
} from '../lib';
import { CameraStreamError, CameraErrorCode } from '../lib/errors';
import type { CameraError } from '../lib/errors';

/**
 * Hook for managing camera stream
 *
 * @param selectedDevice - Currently selected camera device
 * @returns Stream state and control functions
 */
export function useCameraStream(selectedDevice: CameraDevice | null) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track current stream for cleanup
  const streamRef = useRef<MediaStream | null>(null);

  // Prevent duplicate stream start requests
  const startInProgressRef = useRef(false);

  // Track if stream was active before visibility change
  const wasStreamActiveBeforeHidden = useRef(false);

  /**
   * Stop the current stream and clean up tracks
   */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (isMountedRef.current) {
      setStream(null);
      setIsStreamActive(false);
    }
  }, []);

  /**
   * Start camera stream with constraints
   */
  const startStream = useCallback(
    async (
      constraints?: MediaStreamConstraints
    ): Promise<MediaStream | null> => {
      console.log('🎥 useCameraStream: startStream 시작', {
        hasConstraints: !!constraints,
        selectedDevice: selectedDevice?.label,
        isAlreadyStarting: startInProgressRef.current,
      });

      // Prevent duplicate requests
      if (startInProgressRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Stream start already in progress');
        }
        return streamRef.current;
      }

      startInProgressRef.current = true;

      // iOS-specific: fully stop and wait before switching cameras
      if (isIOS() && isSafari() && streamRef.current) {
        console.log('🍎 iOS Safari 감지: 기존 스트림 정리 후 대기');
        stopStream();
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        // Stop existing stream first
        console.log('🛑 기존 스트림 정리');
        stopStream();
      }

      setError(null);

      try {
        // Build constraints based on selected device
        let finalConstraints: MediaStreamConstraints;

        if (constraints) {
          console.log('📋 사용자 정의 constraints 사용');
          finalConstraints = constraints;
        } else if (selectedDevice) {
          // Use device-specific constraints
          const baseConstraints = getRecommendedConstraints();
          console.log('📱 선택된 디바이스로 constraints 구성:', selectedDevice.label);

          finalConstraints = {
            ...baseConstraints,
            video: {
              ...(typeof baseConstraints.video === 'object'
                ? baseConstraints.video
                : {}),
              deviceId: { exact: selectedDevice.deviceId },
            },
          };
        } else {
          // Use recommended constraints
          console.log('⚙️ 기본 권장 constraints 사용');
          finalConstraints = getRecommendedConstraints();
        }

        console.log('📸 getUserMedia 호출 중...', finalConstraints);

        // Request camera stream
        const newStream = await navigator.mediaDevices.getUserMedia(
          finalConstraints
        );

        console.log('✅ getUserMedia 성공:', {
          streamId: newStream.id,
          tracks: newStream.getTracks().map(t => ({ kind: t.kind, label: t.label })),
        });

        // Store stream reference
        streamRef.current = newStream;

        // Update state only if still mounted
        if (isMountedRef.current) {
          setStream(newStream);
          setIsStreamActive(true);
        } else {
          // Component unmounted during async operation, clean up
          newStream.getTracks().forEach((track) => track.stop());
          return null;
        }

        // Listen for track ending
        newStream.getTracks().forEach((track) => {
          track.addEventListener('ended', () => {
            if (isMountedRef.current) {
              setIsStreamActive(false);
            }
          });
        });

        return newStream;
      } catch (err) {
        console.error('❌ getUserMedia 실패:', err);
        const cameraError = mapNativeErrorToCameraError(err, 'stream start');
        console.error('📋 변환된 카메라 에러:', {
          code: cameraError.code,
          userMessage: cameraError.userMessage,
          technicalMessage: cameraError.technicalMessage,
        });

        if (isMountedRef.current) {
          setError(cameraError);
          setIsStreamActive(false);
        }

        // If using device-specific constraints failed, try fallback
        if (
          selectedDevice &&
          constraints === undefined &&
          err instanceof DOMException
        ) {
          console.log('🔄 Fallback 시도: 디바이스 ID 없이 재시도');
          try {
            // Try with just facingMode instead of exact deviceId
            const fallbackConstraints = getRecommendedConstraints();
            console.log('📸 Fallback getUserMedia 호출:', fallbackConstraints);
            const fallbackStream = await navigator.mediaDevices.getUserMedia(
              fallbackConstraints
            );

            console.log('✅ Fallback 성공:', fallbackStream.id);

            streamRef.current = fallbackStream;

            if (isMountedRef.current) {
              setStream(fallbackStream);
              setIsStreamActive(true);
              setError(null);
            } else {
              fallbackStream.getTracks().forEach((track) => track.stop());
              return null;
            }

            return fallbackStream;
          } catch (fallbackErr) {
            console.error('❌ Fallback도 실패:', fallbackErr);
            const fallbackError = mapNativeErrorToCameraError(
              fallbackErr,
              'stream start fallback'
            );
            console.error('📋 Fallback 에러:', {
              code: fallbackError.code,
              userMessage: fallbackError.userMessage,
            });

            if (isMountedRef.current) {
              setError(fallbackError);
            }

            return null;
          }
        }

        console.log('🚫 스트림 시작 실패 - null 반환');
        return null;
      } finally {
        startInProgressRef.current = false;
        console.log('🏁 startStream 완료');
      }
    },
    [selectedDevice, stopStream]
  );

  /**
   * Handle page visibility changes
   * Stop stream when tab is hidden, restart when visible
   */
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden && isStreamActive) {
        // Tab hidden, stop stream to release camera
        wasStreamActiveBeforeHidden.current = true;
        stopStream();
      } else if (!document.hidden && wasStreamActiveBeforeHidden.current) {
        // Tab visible again, restart stream
        wasStreamActiveBeforeHidden.current = false;
        startStream();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStreamActive, stopStream, startStream]);

  /**
   * Cleanup stream on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopStream();
    };
  }, [stopStream]);

  /**
   * Monitor stream tracks for errors
   */
  useEffect(() => {
    if (!stream) {
      return;
    }

    const handleTrackError = (event: Event) => {
      const trackError = new CameraStreamError(
        CameraErrorCode.STREAM_TRACK_ERROR,
        '카메라 스트림에 오류가 발생했습니다.',
        `Camera track error: ${event.type}`,
        ['카메라를 다시 시작해주세요.', '다른 카메라를 선택해보세요.']
      );

      if (isMountedRef.current) {
        setError(trackError);
        setIsStreamActive(false);
      }
    };

    stream.getTracks().forEach((track) => {
      track.addEventListener('error', handleTrackError);
    });

    return () => {
      stream.getTracks().forEach((track) => {
        track.removeEventListener('error', handleTrackError);
      });
    };
  }, [stream]);

  return {
    stream,
    isStreamActive,
    error,
    startStream,
    stopStream,
  };
}
