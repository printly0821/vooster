# Camera UI Components

User-facing UI components for camera error handling and permission management.

## Components Overview

### 1. CameraErrorBanner

Displays camera errors with user-friendly messages and recovery suggestions.

**Features:**
- Automatic error detection from camera context
- Severity-based styling (critical/recoverable/warning/info)
- Retry functionality for retryable errors
- ARIA live region for screen reader announcements
- Vibration feedback on error (if supported)

**Usage:**
```tsx
import { CameraErrorBanner } from '@/features/camera';

<CameraErrorBanner
  showRetryButton
  showCloseButton
  onDismiss={() => console.log('Error dismissed')}
  onRetry={() => console.log('Retrying...')}
/>
```

### 2. CameraPermissionPrompt

UI for requesting camera permission with browser-specific guidance.

**Features:**
- Clear explanation of permission requirement
- Step-by-step instructions for different browsers
- iOS Safari specific guidance
- Accessible with keyboard navigation
- Vibration feedback on success

**Usage:**
```tsx
import { CameraPermissionPrompt } from '@/features/camera';

<CameraPermissionPrompt
  showBrowserInstructions
  onPermissionGranted={() => console.log('Permission granted!')}
  onPermissionRequest={() => console.log('Requesting...')}
/>
```

**Browser-specific instructions:**
- iOS Safari (with Settings app alternative)
- Chrome
- Safari (macOS)
- Firefox
- Generic fallback

### 3. CameraDeviceSelector

Dropdown selector for choosing camera device.

**Features:**
- Shows device labels with appropriate icons (front/back camera)
- Keyboard navigable (arrow keys, Enter)
- Remembers last selected device in localStorage
- Auto-selects if only one device available
- Accessible with proper ARIA labels

**Usage:**
```tsx
import { CameraDeviceSelector } from '@/features/camera';

<CameraDeviceSelector
  rememberDevice
  placeholder="카메라를 선택하세요"
  onDeviceSelect={(deviceId) => console.log('Selected:', deviceId)}
/>
```

**Device Icon Mapping:**
- Front camera → Smartphone icon
- Back/Rear camera → Camera icon
- Other → Video icon

### 4. CameraStatusIndicator

Visual indicator of current camera status.

**Features:**
- Automatic status detection from camera context
- Loading spinner during initialization
- Success/error icons with appropriate colors
- ARIA status announcements for screen readers
- Configurable size and text display

**Status Types:**
- `idle` - Initial state
- `checking-permission` - Permission check in progress
- `permission-denied` - Permission was denied
- `enumerating-devices` - Loading device list
- `ready` - Camera ready to start
- `streaming` - Camera active
- `error` - Error occurred

**Usage:**
```tsx
import { CameraStatusIndicator, CameraStatusBadge } from '@/features/camera';

// Full indicator with text
<CameraStatusIndicator showText size="md" animate />

// Badge variant
<CameraStatusBadge />

// Dot only
<CameraStatusBadge dotOnly />
```

### 5. InsecureContextWarning

Banner warning about insecure (HTTP) context requirements.

**Features:**
- Explains HTTPS security requirement
- Provides HTTPS migration guidance
- Shows localhost alternative for development
- PWA installation prompt for secure context
- Different guidance for production vs development

**Usage:**
```tsx
import { InsecureContextWarning } from '@/features/camera';

<InsecureContextWarning
  showPWAPrompt
  onPWAInstallClick={() => console.log('Install PWA')}
/>
```

**Displays only when:**
- Current context is NOT secure (HTTP)
- Not already in PWA standalone mode

## Accessibility Features

All components implement comprehensive accessibility:

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Proper tab order and focus management
- Enter/Space key activation for buttons

### Screen Readers
- ARIA live regions for dynamic updates
- Proper ARIA labels for icon-only buttons
- Status announcements via `aria-live="polite"` or `aria-live="assertive"`
- Semantic HTML with role attributes

### Visual Accessibility
- WCAG AA compliant color contrast
- Clear focus indicators
- Icons paired with text labels
- Color is not the only indicator of status

### Haptic Feedback
- Vibration patterns for errors (if supported):
  - Critical: Double pulse `[10, 30, 10, 30, 10]`
  - Recoverable/Warning: Single pulse `[10, 30, 10]`
- Success vibration on permission granted: `[50]`

## Integration Example

Complete camera setup flow:

```tsx
import {
  CameraProvider,
  CameraErrorBanner,
  CameraPermissionPrompt,
  CameraDeviceSelector,
  CameraStatusIndicator,
  InsecureContextWarning,
} from '@/features/camera';

export function CameraApp() {
  return (
    <CameraProvider>
      <div className="space-y-4 p-4">
        {/* Status indicator */}
        <CameraStatusIndicator showText />

        {/* Security warning (HTTP only) */}
        <InsecureContextWarning />

        {/* Error display */}
        <CameraErrorBanner showRetryButton />

        {/* Permission request */}
        <CameraPermissionPrompt showBrowserInstructions />

        {/* Device selection */}
        <CameraDeviceSelector rememberDevice />

        {/* Your camera UI */}
        <YourCameraComponent />
      </div>
    </CameraProvider>
  );
}
```

## Styling

All components use:
- **TailwindCSS** for styling
- **shadcn/ui** components (Alert, Button, Card, Select)
- **lucide-react** for icons
- **Responsive design** (mobile-first approach)

### Customization

Components accept `className` prop for custom styling:

```tsx
<CameraErrorBanner className="shadow-xl border-2" />

<CameraPermissionPrompt className="bg-gradient-to-r from-blue-50 to-purple-50" />

<CameraDeviceSelector className="max-w-md mx-auto" />
```

## Examples

See `/examples/UIComponentsUsage.tsx` for:
- Complete camera setup flow
- Minimal implementation
- Custom styled variants
- Status indicator variations

## Dependencies

Required packages:
- `react` (^18.0.0)
- `lucide-react` (icons)
- `@radix-ui/react-*` (via shadcn/ui)
- `class-variance-authority` (styling)
- `tailwindcss` (styling)

## Browser Support

All components work on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- iOS Safari (14.5+)

Special handling for:
- iOS Safari permission quirks
- PWA standalone mode detection
- Secure context requirements
