'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TorchCapability } from '../types';
import type { ExtendedMediaTrackCapabilities } from '../types/media-extensions';
import { TORCH_TOGGLE_DELAY_MS } from '../constants';

/**
 * Hook for controlling camera torch (flashlight)
 *
 * Provides torch on/off control with automatic support detection
 * and graceful degradation for unsupported devices.
 *
 * @param stream - Active MediaStream with video track
 * @returns Torch state and control functions
 *
 * @example
 * ```tsx
 * const { torchCapability, toggleTorch, enableTorch, disableTorch } = useCameraTorch(stream);
 *
 * if (torchCapability.isSupported) {
 *   return (
 *     <button onClick={toggleTorch}>
 *       {torchCapability.isEnabled ? 'Turn Off Flash' : 'Turn On Flash'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCameraTorch(stream: MediaStream | null) {
  const [torchCapability, setTorchCapability] = useState<TorchCapability>({
    isSupported: false,
    isEnabled: false,
  });
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const torchStateRef = useRef(torchCapability.isEnabled);

  // Keep ref in sync with state
  useEffect(() => {
    torchStateRef.current = torchCapability.isEnabled;
  }, [torchCapability.isEnabled]);

  /**
   * Get video track from current stream
   *
   * @returns Video track or null if not available
   */
  const getVideoTrack = useCallback((): MediaStreamTrack | null => {
    if (!stream) return null;
    const videoTracks = stream.getVideoTracks();
    return videoTracks.length > 0 ? (videoTracks[0] ?? null) : null;
  }, [stream]);

  /**
   * Check if torch is supported on current device
   *
   * Uses MediaStreamTrack.getCapabilities() to detect torch support
   */
  const checkTorchSupport = useCallback(() => {
    const track = getVideoTrack();
    if (!track) {
      setTorchCapability({ isSupported: false, isEnabled: false });
      return;
    }

    try {
      const capabilities = track.getCapabilities();
      const isSupported = 'torch' in capabilities && capabilities.torch === true;

      if (isMountedRef.current) {
        setTorchCapability((prev) => ({
          isSupported,
          isEnabled: prev.isEnabled && isSupported, // Reset if not supported
        }));
      }

      console.log('🔦 Torch 지원:', isSupported);
    } catch (err) {
      console.warn('⚠️ Torch 지원 확인 실패:', err);
      if (isMountedRef.current) {
        setTorchCapability({ isSupported: false, isEnabled: false });
      }
    }
  }, [getVideoTrack]);

  /**
   * Toggle torch on/off
   *
   * @throws {Error} If no video track available or torch not supported
   */
  const toggleTorch = useCallback(async (): Promise<void> => {
    const track = getVideoTrack();

    if (!track) {
      const err = new Error('No video track available');
      setError(err);
      throw err;
    }

    if (!torchCapability.isSupported) {
      const err = new Error('Torch not supported on this device');
      setError(err);
      throw err;
    }

    try {
      const newState = !torchCapability.isEnabled;

      await track.applyConstraints({
        advanced: [{ torch: newState } as any],
      });

      // Small delay for hardware to respond
      await new Promise((resolve) => setTimeout(resolve, TORCH_TOGGLE_DELAY_MS));

      if (isMountedRef.current) {
        setTorchCapability((prev) => ({
          ...prev,
          isEnabled: newState,
        }));
        setError(null);
      }

      console.log(`🔦 Torch ${newState ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('❌ Torch 토글 실패:', err);
      if (isMountedRef.current) {
        setError(err as Error);
      }
      throw err;
    }
  }, [getVideoTrack, torchCapability]);

  /**
   * Set torch to specific state
   *
   * Uses a ref to check latest state to avoid closure issues
   *
   * @param enabled - Desired torch state (true = on, false = off)
   * @throws {Error} If torch operation fails
   */
  const setTorch = useCallback(
    async (enabled: boolean): Promise<void> => {
      // Use ref to get current state (avoids stale closure)
      if (torchStateRef.current === enabled) {
        return; // Already in desired state
      }
      await toggleTorch();
    },
    [toggleTorch]
  );

  /**
   * Turn torch on
   *
   * @throws {Error} If torch operation fails
   */
  const enableTorch = useCallback(async (): Promise<void> => {
    await setTorch(true);
  }, [setTorch]);

  /**
   * Turn torch off
   *
   * @throws {Error} If torch operation fails
   */
  const disableTorch = useCallback(async (): Promise<void> => {
    await setTorch(false);
  }, [setTorch]);

  // Check support when stream changes
  useEffect(() => {
    checkTorchSupport();
  }, [stream, checkTorchSupport]);

  // Cleanup: turn off torch on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Best effort to turn off torch (use ref for latest state)
      if (torchStateRef.current) {
        const videoTracks = stream?.getVideoTracks();
        const track = videoTracks && videoTracks.length > 0 ? videoTracks[0] : null;
        if (track) {
          track
            .applyConstraints({
              advanced: [{ torch: false } as any],
            })
            .catch(() => {
              // Ignore errors during cleanup
            });
        }
      }
    };
  }, [stream]);

  return {
    /**
     * Current torch capability and state
     */
    torchCapability,

    /**
     * Last error that occurred, if any
     */
    error,

    /**
     * Toggle torch between on and off
     */
    toggleTorch,

    /**
     * Turn torch on
     */
    enableTorch,

    /**
     * Turn torch off
     */
    disableTorch,

    /**
     * Re-check torch support
     */
    checkTorchSupport,
  };
}
