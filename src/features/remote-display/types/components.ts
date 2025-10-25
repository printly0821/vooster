/**
 * 컴포넌트 Props 타입 정의
 */

import type { Display } from './display';
import type { QRCodePayload } from './pairing';

/**
 * DisplayCard 컴포넌트 Props
 */
export interface DisplayCardProps {
  /** 디스플레이 정보 */
  display: Display;

  /** 현재 페어링된 디스플레이인지 여부 */
  isPaired?: boolean;

  /** 카드 클릭 핸들러 */
  onClick?: (display: Display) => void;

  /** 연결 끊기 핸들러 */
  onDisconnect?: (screenId: string) => void;

  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * ConfirmModal 컴포넌트 Props
 */
export interface ConfirmModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;

  /** QR 코드 페이로드 */
  payload: QRCodePayload | null;

  /** 확인 버튼 클릭 핸들러 */
  onConfirm: () => void | Promise<void>;

  /** 취소 버튼 클릭 핸들러 */
  onCancel: () => void;

  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * DisplayList 컴포넌트 Props
 */
export interface DisplayListProps {
  /** 디스플레이 배열 */
  displays: Display[];

  /** 현재 페어링된 디스플레이 ID */
  pairedScreenId?: string | null;

  /** 디스플레이 선택 핸들러 */
  onSelectDisplay?: (display: Display) => void;

  /** 로딩 상태 */
  isLoading?: boolean;

  /** 에러 메시지 */
  error?: string | null;

  /** 빈 상태 메시지 */
  emptyMessage?: string;
}

/**
 * PairingScanner 컴포넌트 Props
 */
export interface PairingScannerProps {
  /** 페어링 모드 활성화 여부 */
  isPairingMode: boolean;

  /** QR 코드 감지 핸들러 */
  onQRCodeDetected: (payload: QRCodePayload) => void;

  /** 에러 핸들러 */
  onError?: (error: Error) => void;

  /** 취소 핸들러 */
  onCancel?: () => void;
}

/**
 * CurrentPairingStatus 컴포넌트 Props
 */
export interface CurrentPairingStatusProps {
  /** 페어링된 디스플레이 정보 */
  pairedDisplay: Display | null;

  /** 연결 끊기 핸들러 */
  onDisconnect: () => void;

  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * DisplaysDrawer 컴포넌트 Props
 */
export interface DisplaysDrawerProps {
  /** 드로어 열림 상태 */
  open: boolean;

  /** 드로어 닫기 핸들러 */
  onClose: () => void;

  /** QR 스캔 모드로 전환 핸들러 */
  onStartPairing: () => void;
}
