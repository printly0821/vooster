/**
 * Camera Focus Hook
 *
 * Provides manual focus control and focus mode management
 * for better barcode recognition.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ExtendedMediaTrackCapabilities,
  ExtendedMediaTrackSettings,
  hasFocusCapabilities,
} from '../types/media-extensions';

/**
 * Focus capability information
 */
export interface FocusCapability {
  /** Whether manual focus is supported */
  readonly supportsManualFocus: boolean;
  /** Whether continuous auto-focus is supported */
  readonly supportsContinuousFocus: boolean;
  /** Available focus modes */
  readonly focusModes: readonly string[];
  /** Current focus mode */
  readonly currentMode: string | null;
  /** Focus distance range (if supported) */
  readonly focusDistanceRange: { min: number; max: number } | null;
}

/**
 * Use camera focus hook
 *
 * Provides focus control capabilities for the camera stream.
 * Enables manual focus triggering and focus mode management.
 *
 * @param stream - Active MediaStream from camera
 * @returns Focus capability info and control functions
 *
 * @example
 * ```tsx
 * function BarcodeScannerWithFocus() {
 *   const { stream } = useCameraState();
 *   const { focusCapability, triggerFocus, setFocusMode } = useCameraFocus(stream);
 *
 *   return (
 *     <div>
 *       {focusCapability.supportsManualFocus && (
 *         <button onClick={triggerFocus}>Tap to Focus</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCameraFocus(stream: MediaStream | null) {
  const [focusCapability, setFocusCapability] = useState<FocusCapability>({
    supportsManualFocus: false,
    supportsContinuousFocus: false,
    focusModes: [],
    currentMode: null,
    focusDistanceRange: null,
  });

  const isMountedRef = useRef(true);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  /**
   * Check focus capabilities of the camera
   */
  const checkFocusCapabilities = useCallback(() => {
    if (!stream) {
      setFocusCapability({
        supportsManualFocus: false,
        supportsContinuousFocus: false,
        focusModes: [],
        currentMode: null,
        focusDistanceRange: null,
      });
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrackRef.current = videoTrack;

    try {
      const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
      const settings = videoTrack.getSettings() as ExtendedMediaTrackSettings;

      const focusModes = capabilities.focusMode || [];
      const supportsManualFocus =
        focusModes.includes('manual') || focusModes.includes('single-shot');
      const supportsContinuousFocus = focusModes.includes('continuous');

      const currentMode = settings.focusMode || null;

      const focusDistanceRange = capabilities.focusDistance
        ? {
            min: capabilities.focusDistance.min || 0,
            max: capabilities.focusDistance.max || 1,
          }
        : null;

      if (isMountedRef.current) {
        setFocusCapability({
          supportsManualFocus,
          supportsContinuousFocus,
          focusModes,
          currentMode,
          focusDistanceRange,
        });
      }

      console.log('🔍 Focus capabilities:', {
        supportsManualFocus,
        supportsContinuousFocus,
        focusModes,
        currentMode,
        focusDistanceRange,
      });
    } catch (error) {
      console.error('Failed to check focus capabilities:', error);
    }
  }, [stream]);

  /**
   * Trigger manual focus (single-shot)
   *
   * This simulates a "tap to focus" feature by temporarily
   * switching to manual/single-shot mode and back.
   */
  const triggerFocus = useCallback(async (): Promise<void> => {
    const track = videoTrackRef.current;

    // Pre-flight validation
    if (!track) {
      console.warn('⚠️ Cannot trigger focus: no video track available');
      return;
    }

    if (!focusCapability.supportsManualFocus) {
      console.warn('⚠️ Cannot trigger focus: manual focus not supported');
      return;
    }

    // Check if track is in valid state
    if (track.readyState !== 'live') {
      console.warn('⚠️ Cannot trigger focus: track not in live state:', track.readyState);
      return;
    }

    // Additional check: verify track is enabled and not muted
    if (!track.enabled) {
      console.warn('⚠️ Cannot trigger focus: track is disabled');
      return;
    }

    if (track.muted) {
      console.warn('⚠️ Cannot trigger focus: track is muted');
      return;
    }

    try {
      console.log('📸 Triggering manual focus...');

      // Try single-shot focus mode first (preferred for tap-to-focus)
      if (focusCapability.focusModes.includes('single-shot')) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: 'single-shot' } as any],
          });

          // Wait for focus to complete
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Return to continuous mode if supported
          if (focusCapability.supportsContinuousFocus && track.readyState === 'live') {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any],
            });
          }

          console.log('✅ Manual focus triggered (single-shot)');
        } catch (error) {
          console.error('❌ Failed to apply single-shot focus:', error);
          // Don't throw - allow fallback to manual mode
        }
      }
      // Fallback to manual mode
      else if (focusCapability.focusModes.includes('manual')) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: 'manual' } as any],
          });

          // Wait a bit then return to continuous
          await new Promise((resolve) => setTimeout(resolve, 1000));

          if (focusCapability.supportsContinuousFocus && track.readyState === 'live') {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any],
            });
          }

          console.log('✅ Manual focus triggered (manual mode)');
        } catch (error) {
          console.error('❌ Failed to apply manual focus:', error);
        }
      } else {
        console.warn('⚠️ No compatible focus mode available');
      }

      // Update capability state (only if track is still live)
      if (track.readyState === 'live') {
        checkFocusCapabilities();
      }
    } catch (error) {
      console.error('❌ Failed to trigger focus (outer catch):', error);
      // Silently fail - don't disrupt the scanning experience
    }
  }, [focusCapability, checkFocusCapabilities]);

  /**
   * Set focus mode
   *
   * @param mode - Focus mode to set (continuous, manual, single-shot)
   */
  const setFocusMode = useCallback(
    async (mode: 'continuous' | 'manual' | 'single-shot'): Promise<void> => {
      const track = videoTrackRef.current;
      if (!track) {
        console.warn('No video track available');
        return;
      }

      if (!focusCapability.focusModes.includes(mode)) {
        console.warn(`Focus mode "${mode}" not supported`);
        return;
      }

      try {
        console.log(`🔄 Setting focus mode to "${mode}"...`);

        await track.applyConstraints({
          advanced: [{ focusMode: mode } as any],
        });

        console.log(`✅ Focus mode set to "${mode}"`);

        // Update capability state
        checkFocusCapabilities();
      } catch (error) {
        console.error(`❌ Failed to set focus mode to "${mode}":`, error);
      }
    },
    [focusCapability.focusModes, checkFocusCapabilities]
  );

  /**
   * Set focus distance
   *
   * @param distance - Focus distance (0.0 = infinity, 1.0 = minimum distance)
   */
  const setFocusDistance = useCallback(
    async (distance: number): Promise<void> => {
      const track = videoTrackRef.current;
      if (!track || !focusCapability.focusDistanceRange) {
        console.warn('Focus distance control not supported');
        return;
      }

      // Clamp distance to valid range
      const { min, max } = focusCapability.focusDistanceRange;
      const clampedDistance = Math.max(min, Math.min(max, distance));

      try {
        console.log(`📏 Setting focus distance to ${clampedDistance}...`);

        await track.applyConstraints({
          advanced: [{ focusDistance: clampedDistance } as any],
        });

        console.log(`✅ Focus distance set to ${clampedDistance}`);
      } catch (error) {
        console.error(`❌ Failed to set focus distance:`, error);
      }
    },
    [focusCapability.focusDistanceRange]
  );

  /**
   * Check capabilities when stream changes
   */
  useEffect(() => {
    checkFocusCapabilities();
  }, [stream, checkFocusCapabilities]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    focusCapability,
    triggerFocus,
    setFocusMode,
    setFocusDistance,
  };
}
