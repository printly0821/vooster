# useCameraTorch Hook

React hook for controlling camera torch (flashlight) functionality with comprehensive error handling and graceful degradation.

## Features

- ✅ Automatic torch support detection using MediaStreamTrack capabilities
- ✅ Toggle, enable, and disable torch functions
- ✅ Graceful degradation for unsupported devices
- ✅ Automatic torch cleanup on unmount
- ✅ Error handling with detailed error states
- ✅ TypeScript support with full type safety
- ✅ Production-ready with comprehensive test coverage

## Installation

```typescript
import { useCameraTorch } from '@/features/camera/hooks';
```

## Basic Usage

```typescript
'use client';

import { useCameraTorch } from '@/features/camera/hooks';

function CameraControls({ stream }: { stream: MediaStream | null }) {
  const { torchCapability, toggleTorch, error } = useCameraTorch(stream);

  if (!torchCapability.isSupported) {
    return <p>Flashlight not available on this device</p>;
  }

  return (
    <button onClick={toggleTorch}>
      {torchCapability.isEnabled ? '🔦 Turn Off' : '💡 Turn On'}
    </button>
  );
}
```

## API Reference

### Parameters

- `stream: MediaStream | null` - Active MediaStream with video track

### Return Value

```typescript
{
  // State
  torchCapability: {
    isSupported: boolean;  // Whether device supports torch
    isEnabled: boolean;    // Current torch state
  };
  error: Error | null;     // Last error if any

  // Actions
  toggleTorch: () => Promise<void>;        // Toggle between on/off
  enableTorch: () => Promise<void>;        // Turn torch on
  disableTorch: () => Promise<void>;       // Turn torch off
  checkTorchSupport: () => void;           // Re-check support
}
```

## Advanced Examples

### Separate On/Off Buttons

```typescript
const { torchCapability, enableTorch, disableTorch } = useCameraTorch(stream);

return (
  <div>
    <button
      onClick={enableTorch}
      disabled={!torchCapability.isSupported || torchCapability.isEnabled}
    >
      Turn On
    </button>
    <button
      onClick={disableTorch}
      disabled={!torchCapability.isSupported || !torchCapability.isEnabled}
    >
      Turn Off
    </button>
  </div>
);
```

### With Error Handling

```typescript
const { torchCapability, toggleTorch, error, checkTorchSupport } = useCameraTorch(stream);

const handleToggle = async () => {
  try {
    await toggleTorch();
  } catch (err) {
    console.error('Torch toggle failed:', err);
    // Retry after checking support
    checkTorchSupport();
    setTimeout(() => toggleTorch(), 500);
  }
};

return (
  <>
    <button onClick={handleToggle}>
      Toggle Flash
    </button>
    {error && <div className="error">{error.message}</div>}
  </>
);
```

### With Loading State

```typescript
const [isLoading, setIsLoading] = useState(false);
const { torchCapability, toggleTorch } = useCameraTorch(stream);

const handleToggle = async () => {
  setIsLoading(true);
  try {
    await toggleTorch();
  } finally {
    setIsLoading(false);
  }
};

return (
  <button onClick={handleToggle} disabled={isLoading}>
    {isLoading ? 'Toggling...' : 'Toggle Flash'}
  </button>
);
```

## Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Torch Control | ✅ 59+ | ✅ 15.4+ | ❌ | ✅ 79+ |

### Notes

- Torch is primarily supported on mobile devices with rear cameras
- Desktop browsers may not support torch even if they support the API
- iOS Safari requires iOS 15.4+ for torch control
- The hook gracefully handles unsupported devices by setting `isSupported: false`

## Implementation Details

### Torch Support Detection

The hook uses `MediaStreamTrack.getCapabilities()` to detect torch support:

```typescript
const capabilities = track.getCapabilities();
const isSupported = 'torch' in capabilities && capabilities.torch === true;
```

### Torch Control

Torch is controlled via `applyConstraints()`:

```typescript
await track.applyConstraints({
  advanced: [{ torch: true }], // or false
});
```

### Cleanup

The hook automatically turns off the torch when the component unmounts to preserve battery:

```typescript
useEffect(() => {
  return () => {
    // Turn off torch on unmount
    if (torchStateRef.current) {
      // ... cleanup logic
    }
  };
}, [stream]);
```

## Error Handling

The hook provides detailed error information for common failure scenarios:

### No Video Track

```typescript
throw new Error('No video track available');
```

### Torch Not Supported

```typescript
throw new Error('Torch not supported on this device');
```

### Constraint Application Failed

Errors from `applyConstraints()` are propagated and stored in the `error` state.

## Testing

Comprehensive test suite with 18 test cases covering:

- ✅ Torch support detection
- ✅ Toggle functionality (on/off)
- ✅ Specific control functions (enable/disable)
- ✅ Error handling
- ✅ Cleanup behavior
- ✅ Manual support checking
- ✅ Edge cases (no stream, no track, etc.)

Run tests:

```bash
npm test useCameraTorch
```

## Performance Considerations

### Hardware Delay

The hook includes a small delay (`TORCH_TOGGLE_DELAY_MS = 100ms`) after toggling to allow hardware to respond.

### State Synchronization

Uses refs to avoid stale closure issues with rapid toggles:

```typescript
const torchStateRef = useRef(torchCapability.isEnabled);
```

### Cleanup Optimization

Cleanup is dependency-optimized to only run when stream changes.

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { TorchCapability } from '@/features/camera/types';

const capability: TorchCapability = {
  isSupported: true,
  isEnabled: false,
};
```

## See Also

- [useCameraStream](./useCameraStream.ts) - Main camera stream management
- [useCamera](./useCamera.ts) - Complete camera context
- [Camera Types](../types.ts) - Type definitions
- [Camera Constants](../constants.ts) - Configuration values

## License

Part of the Vooster camera feature module.
