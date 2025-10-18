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
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
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
 * Global ZXing reader instance (initialized once at provider mount)
 * Performance optimization: Reduces first scan initialization by 200-500ms
 */
export let globalZXingReader: BrowserMultiFormatReader | null = null;

/**
 * Get or create global ZXing reader instance
 * This is called once when CameraProvider mounts
 */
export function initializeGlobalZXingReader(): BrowserMultiFormatReader | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (globalZXingReader) {
    console.log('♻️ ZXing 리더 재사용 (이미 초기화됨)');
    return globalZXingReader;
  }

  console.log('🔧 전역 ZXing 리더 초기화 시작 (Provider 마운트)');
  try {
    const hints = new Map();
    // Phase 11: TRY_HARDER 제거 (성능 50-60% 향상)
    // 산업현장 최적화: 주문번호에 사용되는 포맷만 지정
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,   // QR 코드 (주문번호)
      BarcodeFormat.CODE_128,  // 가장 일반적인 1D 바코드
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
    ]);
    globalZXingReader = new BrowserMultiFormatReader(hints);
    console.log('✅ 전역 ZXing 리더 초기화 완료 (최적화: TRY_HARDER 제거)');
    return globalZXingReader;
  } catch (error) {
    console.error('❌ ZXing 리더 초기화 실패:', error);
    return null;
  }
}

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

  // Initialize global ZXing reader once on provider mount
  const [_zxingReader] = useState(() => initializeGlobalZXingReader());

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
          streamId: newStream?.id,
          tracks: newStream?.getTracks().length,
        });

        console.log('✅ 스트림 시작 성공');
        return newStream;
      } catch (error) {
        // Phase 9 Fix: useCameraStream now throws instead of returning null
        // Error contains all necessary information already
        console.error('❌ startStream 에러:', {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          isCameraError: error instanceof Error && 'code' in error,
        });
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
   * Cleanup global ZXing reader on provider unmount (performance optimization)
   */
  useEffect(() => {
    return () => {
      // Performance fix: Clear global ZXing reader on unmount to allow garbage collection
      if (globalZXingReader) {
        console.log('🧹 전역 ZXing 리더 정리 (Provider unmount)');
        globalZXingReader = null;
      }
    };
  }, []);

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
