'use client';

import * as React from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Chrome,
  Globe,
  Info,
  Lock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCameraActions, useCameraState } from '../hooks/useCamera';
import { getBrowserName, getIOSCameraInfo } from '../lib/browser-detection';

export interface CameraPermissionPromptProps {
  /** Additional CSS classes */
  className?: string;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Custom button text */
  buttonText?: string;
  /** Callback when permission is requested */
  onPermissionRequest?: () => void;
  /** Callback when permission is granted */
  onPermissionGranted?: () => void;
  /** Whether to show browser-specific instructions */
  showBrowserInstructions?: boolean;
}

/**
 * Triggers vibration feedback when permission is granted
 */
function vibrateOnSuccess() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([50]); // Short success vibration
  }
}

/**
 * CameraPermissionPrompt Component
 *
 * UI for requesting camera permission with browser-specific guidance.
 *
 * Features:
 * - Clear explanation of permission requirement
 * - Step-by-step instructions for different browsers
 * - iOS Safari specific guidance
 * - Accessible with keyboard navigation
 * - Vibration feedback on success
 *
 * @example
 * ```tsx
 * <CameraPermissionPrompt
 *   showBrowserInstructions
 *   onPermissionGranted={() => console.log('Permission granted!')}
 * />
 * ```
 */
export function CameraPermissionPrompt({
  className,
  title = '카메라 권한 필요',
  description = '바코드 스캔을 위해 카메라 접근 권한이 필요합니다.',
  buttonText = '카메라 권한 허용',
  onPermissionRequest,
  onPermissionGranted,
  showBrowserInstructions = true,
}: CameraPermissionPromptProps) {
  const { permissionState, isCheckingPermission } = useCameraState();
  const { requestPermission } = useCameraActions();
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [browserName, setBrowserName] = React.useState<string>('Unknown');
  const [iosInfo, setIosInfo] = React.useState({ isIOS: false, isSafari: false });

  // Get browser info only on client
  React.useEffect(() => {
    setIsMounted(true);
    setBrowserName(getBrowserName());
    setIosInfo(getIOSCameraInfo());
  }, []);

  // Handle permission granted
  React.useEffect(() => {
    if (permissionState === 'granted') {
      vibrateOnSuccess();
      onPermissionGranted?.();
    }
  }, [permissionState, onPermissionGranted]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    onPermissionRequest?.();

    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  // Don't render on server or if permission is already granted
  if (!isMounted || permissionState === 'granted') return null;

  const isLoading = isCheckingPermission || isRequesting;

  return (
    <Card className={cn('p-6 space-y-4', className)}>
      {/* Header with icon */}
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Camera className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Permission request button */}
      <Button
        onClick={handleRequestPermission}
        disabled={isLoading}
        className="w-full"
        size="lg"
        aria-label={buttonText}
      >
        <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
        {isLoading ? '권한 확인 중...' : buttonText}
      </Button>

      {/* Browser-specific instructions */}
      {showBrowserInstructions && (
        <div className="space-y-2">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            aria-expanded={showInstructions}
            aria-controls="browser-instructions"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
            <span>브라우저별 권한 허용 방법</span>
            {showInstructions ? (
              <ChevronUp className="h-4 w-4 ml-auto" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" aria-hidden="true" />
            )}
          </button>

          {showInstructions && (
            <div
              id="browser-instructions"
              className="space-y-3 text-sm bg-muted/50 rounded-lg p-4"
            >
              {/* iOS Safari specific instructions */}
              {iosInfo.isIOS && iosInfo.isSafari && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    <span>iOS Safari</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>브라우저 주소창의 'aA' 또는 자물쇠 아이콘을 탭하세요</li>
                    <li>'웹사이트 설정'을 선택하세요</li>
                    <li>카메라를 '허용'으로 변경하세요</li>
                    <li>페이지를 새로고침하세요</li>
                  </ol>

                  {/* iOS Settings instruction */}
                  <div className="pt-2 border-t">
                    <p className="font-medium mb-1">또는 설정에서:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>설정 앱을 여세요</li>
                      <li>Safari를 선택하세요</li>
                      <li>카메라를 '허용'으로 설정하세요</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Chrome instructions */}
              {browserName === 'Chrome' && !iosInfo.isIOS && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Chrome className="h-4 w-4" aria-hidden="true" />
                    <span>Chrome</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>주소창 왼쪽의 자물쇠 또는 카메라 아이콘을 클릭하세요</li>
                    <li>카메라를 '허용'으로 변경하세요</li>
                    <li>페이지를 새로고침하세요</li>
                  </ol>
                </div>
              )}

              {/* Safari (macOS) instructions */}
              {browserName === 'Safari' && !iosInfo.isIOS && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    <span>Safari (macOS)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>주소창 왼쪽의 카메라 아이콘을 클릭하세요</li>
                    <li>'이 웹사이트에서 허용'을 선택하세요</li>
                    <li>페이지를 새로고침하세요</li>
                  </ol>
                </div>
              )}

              {/* Firefox instructions */}
              {browserName === 'Firefox' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    <span>Firefox</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>주소창 왼쪽의 자물쇠 아이콘을 클릭하세요</li>
                    <li>'권한'에서 카메라를 찾으세요</li>
                    <li>카메라를 '허용'으로 변경하세요</li>
                    <li>페이지를 새로고침하세요</li>
                  </ol>
                </div>
              )}

              {/* Generic instructions */}
              {browserName === 'Unknown' && !iosInfo.isIOS && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    <span>일반적인 방법</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>주소창의 자물쇠 또는 카메라 아이콘을 찾으세요</li>
                    <li>사이트 권한 또는 설정을 열어주세요</li>
                    <li>카메라 권한을 허용으로 변경하세요</li>
                    <li>페이지를 새로고침하세요</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          카메라는 바코드 스캔 목적으로만 사용되며, 영상은 저장되거나
          전송되지 않습니다.
        </p>
      </div>
    </Card>
  );
}
