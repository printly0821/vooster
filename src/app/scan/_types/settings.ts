/**
 * Scan Page Types
 *
 * 바코드 스캔 페이지의 타입 정의
 * - ViewMode: 뷰 모드 (스캔 화면 vs 제작의뢰서 화면)
 * - ScannerSettings: 스캐너 설정
 * - ScanHistoryItem: 스캔 내역 항목
 */

/**
 * 뷰 모드
 * - scanner: 바코드 스캔 화면 (카메라 전체 화면)
 * - report: 제작의뢰서 화면 (문서 전체 화면)
 */
export type ViewMode = 'scanner' | 'report';

/**
 * 스캐너 설정 인터페이스
 * LocalStorage에 저장되어 사용자 설정 유지
 */
export interface ScannerSettings {
  // 📹 카메라 설정
  /** 플래시 모드: 'auto' | 'on' | 'off' */
  flashMode: 'auto' | 'on' | 'off';

  /** 자동 초점 활성화 여부 */
  autoFocus: boolean;

  // 📸 스캔 설정
  /** 중복 방지 쿨다운 시간 (밀리초) */
  cooldownMs: number; // 1000, 1500, 2000, 3000

  /** 자동 종료 타임아웃 (초) */
  timeoutSeconds: number; // 15, 30, 60

  // 🔔 피드백 설정
  /** 진동 피드백 활성화 (스캔 성공 시) */
  vibrationEnabled: boolean;

  /** 소리 피드백 활성화 (스캔 성공 시) */
  soundEnabled: boolean;

  // 🎨 기타 설정
  /** 마지막 사용 카메라 기억 */
  rememberLastCamera: boolean;
}

/**
 * 기본 스캐너 설정
 */
export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  flashMode: 'off',
  autoFocus: true,
  cooldownMs: 1500,
  timeoutSeconds: 30,
  vibrationEnabled: true,
  soundEnabled: false,
  rememberLastCamera: true,
};

/**
 * 스캔 내역 항목
 * LocalStorage에 최대 20개까지 저장
 */
export interface ScanHistoryItem {
  /** 바코드 (주문번호) */
  barcode: string;

  /** 스캔 시간 (Unix timestamp) */
  timestamp: number;

  /** 바코드 형식 (예: CODE_128) */
  format: string;

  /** 품목명 (API 응답에서 추가, 선택) */
  itemName?: string;
}

/**
 * 쿨다운 옵션 (밀리초)
 */
export const COOLDOWN_OPTIONS = [1000, 1500, 2000, 3000] as const;

/**
 * 타임아웃 옵션 (초)
 */
export const TIMEOUT_OPTIONS = [15, 30, 60] as const;
