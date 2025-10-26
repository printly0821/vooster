/**
 * localStorage 타입 정의
 */

/**
 * localStorage에 저장되는 페어링된 디스플레이 데이터
 */
export interface PairedDisplayData {
  /** 디스플레이 ID */
  screenId: string;

  /** 디스플레이 이름 */
  displayName: string;

  /** 페어링 시간 */
  pairedAt: string;

  /** 라인 ID */
  lineId?: string;

  /** 용도 */
  purpose?: string;
}

/**
 * localStorage 키 정의
 */
export const STORAGE_KEYS = {
  /** 페어링된 디스플레이 ID */
  PAIRED_SCREEN_ID: 'remote-display:pairedScreenId',

  /** 페어링 토큰 */
  PAIRING_TOKEN: 'remote-display:pairingToken',

  /** 페어링된 디스플레이 전체 데이터 */
  PAIRED_DISPLAY_DATA: 'remote-display:pairedDisplayData',
} as const;

/**
 * localStorage 헬퍼 타입
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
