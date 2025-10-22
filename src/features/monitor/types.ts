/**
 * 세컨드 모니터 컨트롤러 타입 정의
 */

/**
 * 모니터 상태
 */
export interface MonitorState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  pairingStatus: 'idle' | 'waiting' | 'paired';
  sessionId: string | null;
  pairingToken: string | null;
  pairingUrl: string | null;
  lastOrderNo: string | null;
  errorMessage: string | null;
  popupWindow: Window | null;
}

/**
 * QR 코드 설정
 */
export interface QRCodeOptions {
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  type: 'image/png' | 'image/jpeg';
  width: number;
  margin: number;
  color: {
    dark: string;
    light: string;
  };
}

/**
 * 팝업 설정
 */
export interface PopupSettings {
  features: string;
  name: string;
  width: number;
  height: number;
}

/**
 * 모니터 설정
 */
export interface MonitorSettings {
  autoOpenMode: 'new-window' | 'focus-existing' | 'manual';
  enableMultiScreen: boolean;
  qrCodeSize: 'small' | 'medium' | 'large';
}
