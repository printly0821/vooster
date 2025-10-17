/**
 * Use Camera Video Ref Hook
 *
 * Provides access to register video elements with the camera provider
 * for barcode scanning functionality.
 */

'use client';

import { useContext } from 'react';
import { CameraVideoRefContext } from '../context/CameraProvider';

/**
 * Use camera video ref hook
 *
 * Provides access to the video ref context for registering video elements
 * with the camera provider. This is required for barcode scanning.
 *
 * @returns Video ref context with setVideoElement function
 * @throws Error if used outside CameraProvider
 *
 * @example
 * ```tsx
 * function BarcodeScannerComponent() {
 *   const videoRef = useRef<HTMLVideoElement>(null);
 *   const { setVideoElement } = useCameraVideoRef();
 *
 *   useEffect(() => {
 *     if (videoRef.current) {
 *       setVideoElement(videoRef.current);
 *     }
 *   }, [setVideoElement]);
 *
 *   return <video ref={videoRef} autoPlay playsInline />;
 * }
 * ```
 */
export function useCameraVideoRef() {
  const context = useContext(CameraVideoRefContext);

  if (!context) {
    throw new Error(
      'useCameraVideoRef must be used within a CameraProvider. ' +
        'Wrap your component tree with <CameraProvider>.'
    );
  }

  return context;
}
