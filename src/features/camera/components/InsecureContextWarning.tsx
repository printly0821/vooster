'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Lock,
  Server,
  Shield,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCameraState } from '../hooks/useCamera';
import { isStandalonePWA } from '../lib/browser-detection';

export interface InsecureContextWarningProps {
  /** Additional CSS classes */
  className?: string;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Whether to show PWA installation prompt */
  showPWAPrompt?: boolean;
  /** Callback when PWA install is clicked */
  onPWAInstallClick?: () => void;
}

/**
 * Gets current protocol information (client-side only)
 */
function useProtocolInfo() {
  const [protocolInfo, setProtocolInfo] = React.useState({
    protocol: 'unknown:',
    hostname: '',
    isLocalhost: false,
  });

  React.useEffect(() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]';

    setProtocolInfo({ protocol, hostname, isLocalhost });
  }, []);

  return protocolInfo;
}

/**
 * InsecureContextWarning Component
 *
 * Banner warning about insecure (HTTP) context requirements.
 *
 * Features:
 * - Explains HTTPS security requirement
 * - Provides HTTPS migration guidance
 * - Shows localhost alternative for development
 * - PWA installation prompt for secure context
 * - Different guidance for production vs development
 *
 * @example
 * ```tsx
 * <InsecureContextWarning
 *   showPWAPrompt
 *   onPWAInstallClick={() => console.log('Install PWA')}
 * />
 * ```
 */
export function InsecureContextWarning({
  className,
  title = '보안 연결이 필요합니다',
  description = '카메라 접근을 위해서는 HTTPS 프로토콜이 필요합니다.',
  showPWAPrompt = true,
  onPWAInstallClick,
}: InsecureContextWarningProps) {
  const { secureContext } = useCameraState();
  const { protocol, hostname, isLocalhost } = useProtocolInfo();
  const [isPWAInstallable, setIsPWAInstallable] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  // Check if already in standalone PWA mode (client-side only)
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    setIsStandalone(isStandalonePWA());
  }, []);

  // Listen for PWA install prompt
  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsPWAInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePWAInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsPWAInstallable(false);
      setDeferredPrompt(null);
    }

    onPWAInstallClick?.();
  };

  // Don't render on server or if context is secure or already in PWA
  if (!isMounted || secureContext.isSecure || isStandalone) {
    return null;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Alert variant="warning" className={cn('border-orange-500', className)}>
      <Shield className="h-4 w-4" aria-hidden="true" />

      <AlertTitle className="flex items-center gap-2">
        <Lock className="h-4 w-4" aria-hidden="true" />
        <span>{title}</span>
      </AlertTitle>

      <AlertDescription className="space-y-4">
        <p>{description}</p>

        {/* Current protocol info */}
        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 font-medium mb-1">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>현재 연결 상태</span>
          </div>
          <p className="text-muted-foreground">
            프로토콜: <code className="font-mono">{protocol}</code>
            <br />
            호스트: <code className="font-mono">{hostname}</code>
          </p>
        </div>

        {/* Production guidance */}
        {!isDevelopment && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Server className="h-4 w-4" aria-hidden="true" />
              <span>운영 환경 해결 방법</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>웹사이트에 SSL 인증서를 설치하세요</li>
              <li>HTTPS를 지원하는 호스팅 서비스를 사용하세요</li>
              <li>
                무료 SSL 인증서:{' '}
                <a
                  href="https://letsencrypt.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Let's Encrypt
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
              <li>Cloudflare, Netlify, Vercel 등은 자동 HTTPS 제공</li>
            </ul>
          </div>
        )}

        {/* Development guidance */}
        {isDevelopment && !isLocalhost && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Server className="h-4 w-4" aria-hidden="true" />
              <span>개발 환경 해결 방법</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                localhost 또는 127.0.0.1을 사용하여 접속하세요
                <br />
                <code className="text-xs bg-muted px-1 py-0.5 rounded mt-1 inline-block">
                  http://localhost:3000
                </code>
              </li>
              <li>로컬 개발 서버에 HTTPS를 설정하세요</li>
              <li>
                ngrok 등의 터널링 서비스를 사용하여 HTTPS 테스트를 하세요
              </li>
            </ul>
          </div>
        )}

        {/* PWA installation option */}
        {showPWAPrompt && isPWAInstallable && !isStandalone && (
          <div className="pt-2 border-t">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="font-medium text-sm">앱으로 설치하기</p>
                  <p className="text-sm text-muted-foreground">
                    앱으로 설치하면 보안 연결이 자동으로 활성화됩니다.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePWAInstall}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  앱 설치하기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <Shield className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            브라우저 보안 정책상 카메라, 마이크 등의 미디어 장치는 HTTPS 또는
            localhost에서만 접근할 수 있습니다.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Type definition for BeforeInstallPromptEvent (not in TypeScript by default)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
