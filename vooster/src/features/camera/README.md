# Camera Feature

Complete camera management system for barcode scanning with permission handling, device selection, and stream control.

## Features

- ✅ **Permission Management**: Dual-strategy permission handling (Permissions API + getUserMedia fallback)
- ✅ **Device Enumeration**: Automatic camera detection and smart device selection
- ✅ **Stream Lifecycle**: Complete stream management with cleanup and visibility API integration
- ✅ **SSR Safe**: Server-side rendering compatible with 'use client' directives
- ✅ **Error Handling**: Comprehensive error classification with user-friendly messages
- ✅ **iOS Support**: Special handling for iOS Safari quirks
- ✅ **TypeScript**: Full type safety with comprehensive interfaces

## Quick Start

### 1. Wrap your app with CameraProvider

```tsx
import { CameraProvider } from '@/features/camera';

export default function RootLayout({ children }) {
  return (
    <CameraProvider options={{ autoRequest: true }}>
      {children}
    </CameraProvider>
  );
}
```

### 2. Use the camera in components

```tsx
'use client';
import { useCamera } from '@/features/camera';

export function BarcodeScanner() {
  const { stream, requestPermission } = useCamera();
  // Use camera...
}
```

## API Documentation

See the comprehensive README for full API documentation, hooks reference, and examples.
