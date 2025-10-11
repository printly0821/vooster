# Camera UI Components Quick Reference

## Component List

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **CameraErrorBanner** | Error display | Severity-based styling, retry button, ARIA live, vibration |
| **CameraPermissionPrompt** | Permission request | Browser-specific instructions, iOS guidance, accessible |
| **CameraDeviceSelector** | Device switching | Icons, localStorage, keyboard nav, auto-select |
| **CameraStatusIndicator** | Status display | Loading spinner, status icons, ARIA announcements |
| **CameraStatusBadge** | Compact status | Badge/dot variants, color-coded |
| **InsecureContextWarning** | Security warning | HTTPS guidance, PWA prompt, dev vs prod |

## Import Examples

```tsx
// Import all components
import {
  CameraErrorBanner,
  CameraPermissionPrompt,
  CameraDeviceSelector,
  CameraStatusIndicator,
  CameraStatusBadge,
  InsecureContextWarning,
} from '@/features/camera';

// Or import individually
import { CameraErrorBanner } from '@/features/camera/components/CameraErrorBanner';
```

## Basic Setup

```tsx
import { CameraProvider } from '@/features/camera';

export function App() {
  return (
    <CameraProvider>
      {/* Your camera components */}
    </CameraProvider>
  );
}
```

## Component Dependencies

```
CameraProvider (Required)
  ↓
  └─ CameraErrorBanner ──────────→ useCameraError()
  └─ CameraPermissionPrompt ─────→ useCameraState(), useCameraActions()
  └─ CameraDeviceSelector ───────→ useCameraState(), useCameraActions()
  └─ CameraStatusIndicator ──────→ useCameraState()
  └─ CameraStatusBadge ──────────→ useCameraState()
  └─ InsecureContextWarning ─────→ useCameraState()
```

## Props Reference

### CameraErrorBanner Props
```tsx
{
  className?: string;
  showCloseButton?: boolean;      // default: true
  showRetryButton?: boolean;      // default: true
  retryButtonText?: string;       // default: '다시 시도'
  onDismiss?: () => void;
  onRetry?: () => void;
}
```

### CameraPermissionPrompt Props
```tsx
{
  className?: string;
  title?: string;                 // default: '카메라 권한 필요'
  description?: string;
  buttonText?: string;            // default: '카메라 권한 허용'
  onPermissionRequest?: () => void;
  onPermissionGranted?: () => void;
  showBrowserInstructions?: boolean; // default: true
}
```

### CameraDeviceSelector Props
```tsx
{
  className?: string;
  placeholder?: string;           // default: '카메라를 선택하세요'
  rememberDevice?: boolean;       // default: true (uses localStorage)
  onDeviceSelect?: (deviceId: string) => void;
}
```

### CameraStatusIndicator Props
```tsx
{
  className?: string;
  showText?: boolean;             // default: true
  statusText?: Partial<Record<CameraStatus, string>>;
  size?: 'sm' | 'md' | 'lg';     // default: 'md'
  animate?: boolean;              // default: true
}
```

### CameraStatusBadge Props
```tsx
{
  className?: string;
  dotOnly?: boolean;              // default: false
}
```

### InsecureContextWarning Props
```tsx
{
  className?: string;
  title?: string;
  description?: string;
  showPWAPrompt?: boolean;        // default: true
  onPWAInstallClick?: () => void;
}
```

## Accessibility Features

### Keyboard Navigation
- ✅ All buttons focusable and activatable with Enter/Space
- ✅ Device selector navigable with arrow keys
- ✅ Proper tab order
- ✅ Focus indicators visible

### Screen Readers
- ✅ ARIA live regions for status updates
- ✅ `aria-label` on icon-only buttons
- ✅ Role attributes for semantic structure
- ✅ Status announcements with `aria-live="polite"` or `"assertive"`

### Visual
- ✅ WCAG AA color contrast
- ✅ Icons + text labels
- ✅ Clear focus indicators
- ✅ Multiple status indicators (color, icon, text)

### Haptic
- ✅ Error vibration patterns:
  - Critical: `[10, 30, 10, 30, 10]` (double pulse)
  - Recoverable: `[10, 30, 10]` (single pulse)
- ✅ Success vibration: `[50]`

## Common Patterns

### 1. Complete Camera Setup
```tsx
<CameraProvider>
  <InsecureContextWarning />
  <CameraErrorBanner showRetryButton />
  <CameraPermissionPrompt showBrowserInstructions />
  <CameraDeviceSelector rememberDevice />
  <CameraStatusIndicator showText />
</CameraProvider>
```

### 2. Minimal Setup
```tsx
<CameraProvider autoRequestPermission>
  <CameraErrorBanner />
  <CameraDeviceSelector />
</CameraProvider>
```

### 3. Custom Status Display
```tsx
<div className="flex items-center gap-2">
  <CameraStatusBadge dotOnly />
  <span>Status</span>
</div>
```

### 4. Error Handling Only
```tsx
<CameraProvider>
  <CameraErrorBanner
    showRetryButton={false}
    onDismiss={() => navigate('/home')}
  />
</CameraProvider>
```

## Styling

All components support:
- ✅ Custom `className` prop
- ✅ TailwindCSS utilities
- ✅ Dark mode (via Tailwind dark: prefix)
- ✅ Responsive design (mobile-first)

### Theme Integration
Components use shadcn/ui theme tokens:
- `bg-background`, `text-foreground`
- `bg-primary`, `text-primary-foreground`
- `bg-destructive`, `text-destructive-foreground`
- `border-input`, `ring-ring`

## Testing

### Component Visibility Rules

| Component | Shows When |
|-----------|-----------|
| InsecureContextWarning | HTTP (not HTTPS/localhost) |
| CameraErrorBanner | Error exists in context |
| CameraPermissionPrompt | Permission NOT granted |
| CameraDeviceSelector | Permission granted + devices > 1 |
| CameraStatusIndicator | Always (shows current status) |
| CameraStatusBadge | Always (compact status) |

### Test Scenarios

1. **HTTP Warning**: Test on `http://` URL
2. **Permission Flow**: Test deny → allow flow
3. **Multiple Devices**: Test with 2+ cameras
4. **Single Device**: Verify auto-selection
5. **Error Recovery**: Test retry functionality
6. **iOS Safari**: Test iOS-specific instructions
7. **Keyboard Nav**: Tab through all controls
8. **Screen Reader**: Test with VoiceOver/NVDA

## Examples Location

See `/src/features/camera/examples/`:
- `BasicUsage.tsx` - Basic camera setup
- `AdvancedUsage.tsx` - Advanced patterns
- `UIComponentsUsage.tsx` - All UI components

## File Structure

```
src/features/camera/
├── components/
│   ├── CameraErrorBanner.tsx
│   ├── CameraPermissionPrompt.tsx
│   ├── CameraDeviceSelector.tsx
│   ├── CameraStatusIndicator.tsx
│   ├── InsecureContextWarning.tsx
│   ├── index.ts
│   └── README.md
├── examples/
│   ├── BasicUsage.tsx
│   ├── AdvancedUsage.tsx
│   ├── UIComponentsUsage.tsx
│   └── index.ts
└── index.ts (exports all)
```

## Browser-Specific Notes

### iOS Safari
- Shows specific permission instructions
- Settings app alternative provided
- Standalone PWA detection
- iOS version checking

### Chrome/Edge
- Address bar icon instructions
- Standard getUserMedia flow

### Firefox
- Lock icon permission access
- Connection security emphasis

### Safari (macOS)
- Camera icon in address bar
- "Allow this website" flow
