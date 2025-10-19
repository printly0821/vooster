/**
 * Main camera hook
 *
 * Primary hook for accessing camera context in components
 */

'use client';

import { useContext, useMemo } from 'react';
import { CameraContext } from '../context/CameraProvider';
import type { CameraContextValue } from '../types';

/**
 * Hook to access camera context
 *
 * Must be used within a CameraProvider component tree.
 *
 * @throws Error if used outside of CameraProvider
 *
 * @example
 * ```tsx
 * function BarcodeScanner() {
 *   const {
 *     permissionState,
 *     devices,
 *     selectedDevice,
 *     stream,
 *     requestPermission,
 *     selectDevice,
 *     startStream,
 *   } = useCamera();
 *
 *   // Use camera state and actions...
 * }
 * ```
 */
export function useCamera(): CameraContextValue {
  const context = useContext(CameraContext);

  if (!context) {
    throw new Error(
      'useCamera must be used within a CameraProvider. ' +
        'Wrap your component tree with <CameraProvider>.'
    );
  }

  return context;
}

/**
 * Hook to access camera state only (no actions)
 *
 * Useful when you only need to read state without triggering actions.
 *
 * @example
 * ```tsx
 * function CameraStatus() {
 *   const { permissionState, isStreamActive } = useCameraState();
 *
 *   return (
 *     <div>
 *       Permission: {permissionState}
 *       Stream: {isStreamActive ? 'Active' : 'Inactive'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCameraState() {
  const context = useCamera();

  return useMemo(
    () => ({
      permissionState: context.permissionState,
      isCheckingPermission: context.isCheckingPermission,
      devices: context.devices,
      isEnumeratingDevices: context.isEnumeratingDevices,
      selectedDevice: context.selectedDevice,
      error: context.error,
      secureContext: context.secureContext,
      isStreamActive: context.isStreamActive,
      stream: context.stream,
      barcodeScanner: context.barcodeScanner,
      torchCapability: context.torchCapability,
    }),
    [context]
  );
}

/**
 * Hook to access camera actions only (no state)
 *
 * Useful when you only need to trigger actions without reading state.
 * Provides stable references that won't cause unnecessary re-renders.
 *
 * @example
 * ```tsx
 * function CameraControls() {
 *   const { requestPermission, startStream, stopStream } = useCameraActions();
 *
 *   return (
 *     <div>
 *       <button onClick={requestPermission}>Request Permission</button>
 *       <button onClick={() => startStream()}>Start</button>
 *       <button onClick={stopStream}>Stop</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCameraActions() {
  const context = useCamera();

  return useMemo(
    () => ({
      requestPermission: context.requestPermission,
      enumerateDevices: context.enumerateDevices,
      selectDevice: context.selectDevice,
      startStream: context.startStream,
      stopStream: context.stopStream,
      clearError: context.clearError,
      retry: context.retry,
      startBarcodeScanning: context.startBarcodeScanning,
      stopBarcodeScanning: context.stopBarcodeScanning,
      pauseBarcodeScanning: context.pauseBarcodeScanning,
      resumeBarcodeScanning: context.resumeBarcodeScanning,
      toggleTorch: context.toggleTorch,
    }),
    [context]
  );
}

/**
 * Hook to check if camera is ready to use
 *
 * Returns true when permission is granted and device is selected.
 *
 * @example
 * ```tsx
 * function BarcodeScanner() {
 *   const isReady = useCameraReady();
 *   const { startStream } = useCameraActions();
 *
 *   useEffect(() => {
 *     if (isReady) {
 *       startStream();
 *     }
 *   }, [isReady, startStream]);
 *
 *   if (!isReady) {
 *     return <div>Setting up camera...</div>;
 *   }
 *
 *   return <video />;
 * }
 * ```
 */
export function useCameraReady(): boolean {
  const { permissionState, selectedDevice } = useCameraState();

  return permissionState === 'granted' && selectedDevice !== null;
}

/**
 * Hook to access camera error state
 *
 * Provides error information and recovery actions.
 *
 * @example
 * ```tsx
 * function CameraErrorDisplay() {
 *   const { error, clearError, retry } = useCameraError();
 *
 *   if (!error) return null;
 *
 *   return (
 *     <div className="error">
 *       <h3>{error.userMessage}</h3>
 *       <ul>
 *         {error.recoverySuggestions.map((suggestion, i) => (
 *           <li key={i}>{suggestion}</li>
 *         ))}
 *       </ul>
 *       {error.isRetryable && (
 *         <button onClick={retry}>Retry</button>
 *       )}
 *       <button onClick={clearError}>Dismiss</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCameraError() {
  const { error, clearError, retry } = useCamera();

  return useMemo(
    () => ({
      error,
      clearError,
      retry,
      hasError: error !== null,
      isRetryable: error?.isRetryable ?? false,
    }),
    [error, clearError, retry]
  );
}

/**
 * Hook to access current camera stream
 *
 * Returns the active MediaStream if available.
 *
 * @example
 * ```tsx
 * function VideoPreview() {
 *   const stream = useCameraStream();
 *   const videoRef = useRef<HTMLVideoElement>(null);
 *
 *   useEffect(() => {
 *     if (videoRef.current && stream) {
 *       videoRef.current.srcObject = stream;
 *     }
 *   }, [stream]);
 *
 *   return <video ref={videoRef} autoPlay playsInline />;
 * }
 * ```
 */
export function useCameraStreamOnly(): MediaStream | null {
  const { stream } = useCameraState();
  return stream;
}

/**
 * Hook to access camera devices only
 *
 * P2-1: Selective Hook for devices - 리렌더링 최소화
 *
 * @example
 * ```tsx
 * function DeviceSelector() {
 *   const { devices, selectedDevice } = useCameraDevicesOnly();
 *
 *   return (
 *     <select>
 *       {devices.map(d => <option value={d.deviceId}>{d.label}</option>)}
 *     </select>
 *   );
 * }
 * ```
 */
export function useCameraDevicesOnly() {
  const context = useCamera();

  return useMemo(
    () => ({
      devices: context.devices,
      selectedDevice: context.selectedDevice,
      isEnumeratingDevices: context.isEnumeratingDevices,
    }),
    [context.devices, context.selectedDevice, context.isEnumeratingDevices]
  );
}

/**
 * Hook to access camera permissions only
 *
 * P2-1: Selective Hook for permissions - 리렌더링 최소화
 *
 * @example
 * ```tsx
 * function PermissionPrompt() {
 *   const { permissionState, isCheckingPermission } = useCameraPermissionsOnly();
 *
 *   return <div>Permission: {permissionState}</div>;
 * }
 * ```
 */
export function useCameraPermissionsOnly() {
  const context = useCamera();

  return useMemo(
    () => ({
      permissionState: context.permissionState,
      isCheckingPermission: context.isCheckingPermission,
    }),
    [context.permissionState, context.isCheckingPermission]
  );
}

/**
 * Hook to access barcode scanner state only
 *
 * P2-1: Selective Hook for barcode scanner - 리렌더링 최소화
 *
 * @example
 * ```tsx
 * function ScannerStatus() {
 *   const { isScanning, isPaused, lastResult } = useBarcodeScannerOnly();
 *
 *   return <div>Scanning: {isScanning ? 'Yes' : 'No'}</div>;
 * }
 * ```
 */
export function useBarcodeScannerOnly() {
  const context = useCamera();

  return useMemo(
    () => context.barcodeScanner,
    [context.barcodeScanner]
  );
}

/**
 * Hook to access camera torch capability only
 *
 * P2-1: Selective Hook for torch - 리렌더링 최소화
 *
 * @example
 * ```tsx
 * function FlashToggle() {
 *   const torchCapability = useCameraTorchOnly();
 *   const { toggleTorch } = useCameraActions();
 *
 *   if (!torchCapability.isSupported) return null;
 *
 *   return (
 *     <button onClick={toggleTorch}>
 *       Flash: {torchCapability.isEnabled ? 'ON' : 'OFF'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCameraTorchOnly() {
  const context = useCamera();

  return useMemo(
    () => context.torchCapability,
    [context.torchCapability]
  );
}
