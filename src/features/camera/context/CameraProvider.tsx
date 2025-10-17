/**
 * Camera context provider
 *
 * Manages camera state machine, permissions, devices, and stream lifecycle
 * with SSR safety and comprehensive error handling.
 */

'use client';

import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type {
  CameraContextValue,
  CameraContextState,
  CameraPermissionState,
  CameraDevice,
  CameraInitOptions,
  BarcodeScannerConfig,
} from '../types';
import {
  getSecureContextInfo,
  detectCameraBrowserSupport,
  isCameraSupported,
  createUnsupportedBrowserError,
  createInsecureContextError,
} from '../lib';
import type { CameraError } from '../lib/errors';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useCameraDevices } from '../hooks/useCameraDevices';
import { useCameraStream } from '../hooks/useCameraStream';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useCameraTorch } from '../hooks/useCameraTorch';

/**
 * Camera context
 */
export const CameraContext = createContext<CameraContextValue | null>(null);

/**
 * Camera video ref context
 *
 * Provides a way for child components to register their video element
 * with the camera provider for barcode scanning.
 */
export const CameraVideoRefContext = createContext<{
  setVideoElement: (element: HTMLVideoElement | null) => void;
} | null>(null);

/**
 * Camera provider props
 */
export interface CameraProviderProps {
  children: ReactNode;
  options?: CameraInitOptions;
}

/**
 * Camera state machine states
 */
type CameraState =
  | 'idle'
  | 'checking-support'
  | 'requesting-permission'
  | 'enumerating-devices'
  | 'ready'
  | 'error';

/**
 * Camera provider component
 *
 * Provides camera context to all child components with full state management.
 *
 * @example
 * ```tsx
 * <CameraProvider options={{ autoRequest: true }}>
 *   <BarcodeScanner />
 * </CameraProvider>
 * ```
 */
export function CameraProvider({ children, options }: CameraProviderProps) {
  // State machine
  const [machineState, setMachineState] = useState<CameraState>('idle');

  // Global error state
  const [globalError, setGlobalError] = useState<CameraError | null>(null);

  // Barcode scanner configuration state
  const [barcodeScannerConfig, setBarcodeScannerConfig] =
    useState<BarcodeScannerConfig | undefined>(undefined);

  // Video element ref for barcode scanner
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Secure context info
  const [secureContext] = useState(() =>
    typeof window !== 'undefined'
      ? getSecureContextInfo()
      : {
          isSecure: false,
          protocol: 'unknown:',
          isLocalhost: false,
        }
  );

  // Browser support info
  const [browserSupport] = useState(() =>
    typeof navigator !== 'undefined'
      ? detectCameraBrowserSupport()
      : {
          hasGetUserMedia: false,
          hasEnumerateDevices: false,
          hasPermissionsAPI: false,
          hasMediaDevices: false,
          ios: {
            isIOS: false,
            isSafari: false,
            isStandalone: false,
          },
        }
  );

  // Use child hooks
  const {
    permissionState,
    isCheckingPermission,
    error: permissionError,
    checkPermission,
    requestPermission: requestPermissionHook,
  } = useCameraPermissions();

  const {
    devices,
    selectedDevice,
    isEnumeratingDevices,
    error: devicesError,
    enumerateDevices: enumerateDevicesHook,
    selectDevice: selectDeviceHook,
  } = useCameraDevices(permissionState);

  const {
    stream,
    isStreamActive,
    error: streamError,
    startStream: startStreamHook,
    stopStream: stopStreamHook,
  } = useCameraStream(selectedDevice);

  // Barcode scanner hook
  const {
    isScanning: isScanningBarcode,
    isPaused: isBarcodePaused,
    lastResult: lastBarcodeResult,
    error: barcodeError,
    startScanning: startBarcodeScan,
    stopScanning: stopBarcodeScan,
    pauseScanning: pauseBarcodeScan,
    resumeScanning: resumeBarcodeScan,
  } = useBarcodeScanner(stream, videoRef.current, barcodeScannerConfig);

  // Torch control hook
  const {
    torchCapability,
    toggleTorch: toggleTorchControl,
  } = useCameraTorch(stream);

  /**
   * Aggregate errors from all sources
   */
  const currentError = useMemo(() => {
    return (
      globalError ||
      permissionError ||
      devicesError ||
      streamError ||
      (barcodeError as CameraError | null)
    );
  }, [globalError, permissionError, devicesError, streamError, barcodeError]);

  /**
   * Clear all errors
   */
  const clearError = useCallback(() => {
    setGlobalError(null);
    // Child hooks manage their own errors
  }, []);

  /**
   * Request permission action
   */
  const requestPermission = useCallback(async (): Promise<CameraPermissionState> => {
    setMachineState('requesting-permission');
    setGlobalError(null);

    const state = await requestPermissionHook();

    if (state === 'granted') {
      setMachineState('enumerating-devices');
    } else {
      setMachineState('error');
    }

    return state;
  }, [requestPermissionHook]);

  /**
   * Enumerate devices action
   */
  const enumerateDevices = useCallback(async (): Promise<CameraDevice[]> => {
    if (permissionState !== 'granted') {
      const devices: CameraDevice[] = [];
      return devices;
    }

    setMachineState('enumerating-devices');
    setGlobalError(null);

    const deviceList = await enumerateDevicesHook();

    if (deviceList.length > 0) {
      setMachineState('ready');
    }

    return deviceList;
  }, [permissionState, enumerateDevicesHook]);

  /**
   * Select device action
   */
  const selectDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      setGlobalError(null);
      await selectDeviceHook(deviceId);
    },
    [selectDeviceHook]
  );

  /**
   * Start stream action
   */
  const startStream = useCallback(
    async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
      setGlobalError(null);

      console.log('🎬 CameraProvider: startStream 호출됨', {
        hasConstraints: !!constraints,
        selectedDevice: selectedDevice?.label,
        hasSelectedDevice: !!selectedDevice,
        permissionState,
        streamError: streamError?.userMessage,
      });

      // Pre-flight checks
      if (!constraints && !selectedDevice) {
        const error = new Error('카메라 디바이스를 먼저 선택해주세요.');
        console.error('❌ 선택된 디바이스 없음');
        throw error;
      }

      if (permissionState !== 'granted') {
        const error = new Error('카메라 권한이 필요합니다. 권한을 먼저 허용해주세요.');
        console.error('❌ 권한 없음:', permissionState);
        throw error;
      }

      try {
        const newStream = await startStreamHook(constraints);

        console.log('📹 CameraProvider: startStreamHook 결과', {
          hasStream: !!newStream,
          streamError: streamError?.userMessage,
        });

        if (!newStream) {
          throw new Error(streamError?.userMessage || '카메라 스트림을 시작할 수 없습니다.');
        }

        console.log('✅ 스트림 시작 성공');
        return newStream;
      } catch (error) {
        console.error('❌ startStream 에러:', error);
        // Re-throw with better context if it's a generic error
        if (error instanceof Error && streamError) {
          throw new Error(streamError.userMessage || error.message);
        }
        throw error;
      }
    },
    [startStreamHook, streamError, selectedDevice, permissionState]
  );

  /**
   * Stop stream action
   */
  const stopStream = useCallback(() => {
    stopStreamHook();
  }, [stopStreamHook]);

  /**
   * Retry last failed operation
   */
  const retry = useCallback(async (): Promise<void> => {
    clearError();

    // Retry based on current machine state
    if (machineState === 'error' || machineState === 'idle') {
      // Restart from permission request
      await requestPermission();
    }
  }, [clearError, machineState, requestPermission]);

  /**
   * Check browser support and secure context on mount
   */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    setMachineState('checking-support');

    // Check secure context
    if (!secureContext.isSecure) {
      const error = createInsecureContextError(secureContext.protocol);
      setGlobalError(error);
      setMachineState('error');
      return;
    }

    // Check browser support
    if (!isCameraSupported()) {
      const error = createUnsupportedBrowserError();
      setGlobalError(error);
      setMachineState('error');
      return;
    }

    // Browser is supported, move to idle/ready state
    setMachineState('idle');

    // Auto-request permission if configured
    if (options?.autoRequest) {
      requestPermission();
    }
  }, [secureContext, options?.autoRequest, requestPermission]);

  /**
   * Auto-enumerate devices when permission granted
   */
  useEffect(() => {
    if (
      permissionState === 'granted' &&
      devices.length === 0 &&
      options?.autoEnumerate !== false
    ) {
      enumerateDevices();
    }
  }, [permissionState, devices.length, options?.autoEnumerate, enumerateDevices]);

  /**
   * Auto-start stream when device selected
   */
  useEffect(() => {
    if (
      selectedDevice &&
      !isStreamActive &&
      options?.autoStartStream &&
      permissionState === 'granted'
    ) {
      startStream();
    }
  }, [
    selectedDevice,
    isStreamActive,
    options?.autoStartStream,
    permissionState,
    startStream,
  ]);

  /**
   * Aggregate barcode scanner state
   */
  const barcodeScannerState = useMemo(
    () => ({
      isScanning: isScanningBarcode,
      isPaused: isBarcodePaused,
      lastResult: lastBarcodeResult,
      error: barcodeError as CameraError | null,
    }),
    [isScanningBarcode, isBarcodePaused, lastBarcodeResult, barcodeError]
  );

  /**
   * Build context state
   */
  const state: CameraContextState = useMemo(
    () => ({
      permissionState,
      isCheckingPermission,
      devices,
      isEnumeratingDevices,
      selectedDevice,
      error: currentError,
      secureContext,
      isStreamActive,
      stream,
      barcodeScanner: barcodeScannerState,
      torchCapability,
    }),
    [
      permissionState,
      isCheckingPermission,
      devices,
      isEnumeratingDevices,
      selectedDevice,
      currentError,
      secureContext,
      isStreamActive,
      stream,
      barcodeScannerState,
      torchCapability,
    ]
  );

  /**
   * Build context value
   */
  const contextValue: CameraContextValue = useMemo(
    () => ({
      ...state,
      requestPermission,
      enumerateDevices,
      selectDevice,
      startStream,
      stopStream,
      clearError,
      retry,
      startBarcodeScanning: async (config?: BarcodeScannerConfig) => {
        setBarcodeScannerConfig(config);
        await startBarcodeScan();
      },
      stopBarcodeScanning: stopBarcodeScan,
      pauseBarcodeScanning: pauseBarcodeScan,
      resumeBarcodeScanning: resumeBarcodeScan,
      toggleTorch: toggleTorchControl,
    }),
    [
      state,
      requestPermission,
      enumerateDevices,
      selectDevice,
      startStream,
      stopStream,
      clearError,
      retry,
      startBarcodeScan,
      stopBarcodeScan,
      pauseBarcodeScan,
      resumeBarcodeScan,
      toggleTorchControl,
    ]
  );

  /**
   * Video ref setter for children to register their video elements
   */
  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  const videoRefContextValue = useMemo(
    () => ({ setVideoElement }),
    [setVideoElement]
  );

  return (
    <CameraContext.Provider value={contextValue}>
      <CameraVideoRefContext.Provider value={videoRefContextValue}>
        {children}
      </CameraVideoRefContext.Provider>
    </CameraContext.Provider>
  );
}
