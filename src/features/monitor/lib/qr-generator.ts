/**
 * QR 코드 생성 유틸리티
 */

import QRCode from 'qrcode';
import type { QRCodeOptions } from '../types';

/**
 * 기본 QR 코드 설정
 */
export const DEFAULT_QR_OPTIONS: QRCodeOptions = {
  errorCorrectionLevel: 'H',
  type: 'image/png',
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
};

/**
 * QR 코드 크기별 설정
 */
export const QR_SIZES = {
  small: { width: 200, margin: 1 },
  medium: { width: 300, margin: 2 },
  large: { width: 400, margin: 3 },
};

/**
 * Canvas에 QR 코드를 그립니다
 */
export async function generateQRToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options?: Partial<QRCodeOptions>
): Promise<void> {
  const mergedOptions = {
    ...DEFAULT_QR_OPTIONS,
    ...options,
  };

  return QRCode.toCanvas(canvas, text, {
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    color: mergedOptions.color,
  } as any);
}

/**
 * 데이터 URL로 QR 코드를 생성합니다
 */
export function generateQRToDataURL(
  text: string,
  options?: Partial<QRCodeOptions>
): Promise<string> {
  const mergedOptions = {
    ...DEFAULT_QR_OPTIONS,
    ...options,
  };

  return QRCode.toDataURL(text, {
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    color: mergedOptions.color,
  } as any) as any;
}

/**
 * 페어링 URL로 QR 코드를 생성합니다
 */
export async function generatePairingQR(
  canvas: HTMLCanvasElement,
  sessionId: string,
  pairingToken: string,
  appBaseUrl: string = 'https://app.example.com'
): Promise<void> {
  const params = new URLSearchParams({
    sid: sessionId,
    t: pairingToken,
  });
  const url = `${appBaseUrl}/pair?${params.toString()}`;

  return generateQRToCanvas(canvas, url);
}
