/**
 * Camera permissions hook
 *
 * Handles permission checking and subscription using dual strategy:
 * 1. Permissions API with subscription (where supported)
 * 2. getUserMedia fallback (Safari, iOS)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CameraPermissionState } from '../types';
import {
  hasPermissionsAPI,
  mapNativeErrorToCameraError,
  createPermissionCheckError,
} from '../lib';
import type { CameraError } from '../lib/errors';

/**
 * Permission check result
 */
interface PermissionCheckResult {
  state: CameraPermissionState;
  error: CameraError | null;
}

/**
 * Hook for managing camera permissions
 *
 * @returns Permission state and request function
 */
export function useCameraPermissions() {
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>('prompt');
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);

  // Prevent duplicate permission requests
  const requestInProgressRef = useRef(false);

  /**
   * Validates permission state string
   */
  const validatePermissionState = useCallback((state: string): CameraPermissionState => {
    const validStates: readonly string[] = ['granted', 'denied', 'prompt'];
    if (validStates.includes(state)) {
      return state as CameraPermissionState;
    }
    return 'unsupported';
  }, []);

  /**
   * Check permission using Permissions API
   */
  const checkPermissionWithAPI = useCallback(
    async (): Promise<PermissionCheckResult> => {
      try {
        if (!hasPermissionsAPI()) {
          return { state: 'unsupported', error: null };
        }

        const result = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });

        const state = validatePermissionState(result.state);
        return { state, error: null };
      } catch (err) {
        // Permissions API not supported or query failed
        if (process.env.NODE_ENV === 'development') {
          console.warn('Permission API query failed:', err);
        }
        return { state: 'unsupported', error: null };
      }
    },
    [validatePermissionState]
  );

  /**
   * Check permission using getUserMedia fallback
   */
  const checkPermissionWithGetUserMedia = useCallback(
    async (): Promise<PermissionCheckResult> => {
      try {
        // Try to get a stream briefly to check permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        // Stop the stream immediately
        stream.getTracks().forEach((track) => track.stop());

        return { state: 'granted', error: null };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          return { state: 'denied', error: null };
        }

        const cameraError = mapNativeErrorToCameraError(
          err,
          'permission check'
        );
        return { state: 'prompt', error: cameraError };
      }
    },
    []
  );

  /**
   * Check current permission state
   */
  const checkPermission = useCallback(async (): Promise<CameraPermissionState> => {
    setIsCheckingPermission(true);
    setError(null);

    try {
      // Try Permissions API first
      const apiResult = await checkPermissionWithAPI();

      if (apiResult.state !== 'unsupported') {
        setPermissionState(apiResult.state);
        return apiResult.state;
      }

      // Fallback to getUserMedia
      const fallbackResult = await checkPermissionWithGetUserMedia();

      if (fallbackResult.error) {
        setError(fallbackResult.error);
      }

      setPermissionState(fallbackResult.state);
      return fallbackResult.state;
    } catch (err) {
      const cameraError = createPermissionCheckError(err as Error);
      setError(cameraError);
      setPermissionState('prompt');
      return 'prompt';
    } finally {
      setIsCheckingPermission(false);
    }
  }, [checkPermissionWithAPI, checkPermissionWithGetUserMedia]);

  /**
   * Request camera permission
   */
  const requestPermission = useCallback(async (): Promise<CameraPermissionState> => {
    // Prevent duplicate requests
    if (requestInProgressRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Permission request already in progress');
      }
      return permissionState;
    }

    requestInProgressRef.current = true;
    setIsCheckingPermission(true);
    setError(null);

    try {
      // Requesting permission is done by calling getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      // Stop the stream immediately - we only needed it for permission
      stream.getTracks().forEach((track) => track.stop());

      setPermissionState('granted');
      return 'granted';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionState('denied');
        return 'denied';
      }

      const cameraError = mapNativeErrorToCameraError(
        err,
        'permission request'
      );
      setError(cameraError);

      // Don't change permission state for technical errors
      // State should reflect actual permission, not operation failure
      return permissionState;
    } finally {
      requestInProgressRef.current = false;
      setIsCheckingPermission(false);
    }
  }, [permissionState]);

  /**
   * Subscribe to permission changes (if supported)
   */
  useEffect(() => {
    if (!hasPermissionsAPI()) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const subscribeToPermissionChanges = async () => {
      try {
        const permissionStatus = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });

        // Update state with initial value
        setPermissionState(validatePermissionState(permissionStatus.state));

        // Listen for changes
        const handleChange = () => {
          setPermissionState(validatePermissionState(permissionStatus.state));
        };

        permissionStatus.addEventListener('change', handleChange);

        cleanup = () => {
          permissionStatus.removeEventListener('change', handleChange);
        };
      } catch (err) {
        // Permission query not supported
        if (process.env.NODE_ENV === 'development') {
          console.warn('Permission subscription not supported:', err);
        }
      }
    };

    subscribeToPermissionChanges();

    return () => {
      cleanup?.();
    };
  }, [validatePermissionState]);

  return {
    permissionState,
    isCheckingPermission,
    error,
    checkPermission,
    requestPermission,
  };
}
