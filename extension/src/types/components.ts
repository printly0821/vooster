/**
 * Preact 컴포넌트 Props 타입 정의
 *
 * 모든 Preact 컴포넌트의 Props를 중앙에서 관리하여
 * 타입 안전성과 재사용성을 보장합니다.
 */

import type { PairingError } from './pairing';

/**
 * 공통 컴포넌트 Props
 */
export interface BaseComponentProps {
  /** CSS 클래스명 (선택적) */
  className?: string;
  /** 테스트 ID (선택적) */
  testId?: string;
}

/**
 * Button 컴포넌트 Props
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>클릭</Button>
 */
export interface ButtonProps extends BaseComponentProps {
  /** 버튼 텍스트 */
  children: string;
  /** 버튼 스타일 (primary, secondary, danger) */
  variant?: 'primary' | 'secondary' | 'danger';
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 로딩 중 여부 */
  loading?: boolean;
  /** 클릭 이벤트 핸들러 */
  onClick?: () => void;
  /** 버튼 타입 (submit, button) */
  type?: 'button' | 'submit';
}

/**
 * Input 컴포넌트 Props
 *
 * @example
 * <Input label="디스플레이 이름" value={name} onChange={setName} />
 */
export interface InputProps extends BaseComponentProps {
  /** 입력 필드 라벨 */
  label: string;
  /** 입력 값 */
  value: string;
  /** 값 변경 핸들러 */
  onChange: (value: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 필수 입력 여부 */
  required?: boolean;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 에러 메시지 */
  error?: string;
  /** 입력 타입 (text, email, password) */
  type?: 'text' | 'email' | 'password';
}

/**
 * DisplayInfoForm 컴포넌트 Props
 *
 * 디스플레이 정보를 입력받는 폼 컴포넌트입니다.
 */
export interface DisplayInfoFormProps extends BaseComponentProps {
  /** 디스플레이 이름 */
  displayName: string;
  /** 디스플레이 이름 변경 핸들러 */
  onDisplayNameChange: (name: string) => void;
  /** 폼 제출 핸들러 */
  onSubmit: () => void;
  /** 제출 중 여부 */
  loading: boolean;
  /** 에러 정보 */
  error?: PairingError;
}

/**
 * QRPairing 컴포넌트 Props
 *
 * QR 코드를 표시하고 페어링을 기다리는 컴포넌트입니다.
 */
export interface QRPairingProps extends BaseComponentProps {
  /** 페어링 토큰 (QR 코드에 인코딩) */
  pairingToken: string;
  /** QR 코드 만료 시간 (Unix timestamp 밀리초) */
  expiresAt: number;
  /** 폴링 중 여부 */
  polling: boolean;
  /** 취소 핸들러 */
  onCancel: () => void;
  /** QR 재생성 핸들러 (만료 시) */
  onRegenerate: () => void;
}

/**
 * Dashboard 컴포넌트 Props
 *
 * 페어링 완료 후 디스플레이 정보를 보여주는 컴포넌트입니다.
 */
export interface DashboardProps extends BaseComponentProps {
  /** 디스플레이 이름 */
  displayName: string;
  /** 디스플레이 ID */
  displayId: string;
  /** WebSocket 연결 상태 */
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  /** 페어링 해제 핸들러 */
  onUnpair: () => void;
}

/**
 * ErrorDisplay 컴포넌트 Props
 *
 * 에러 메시지를 표시하고 재시도 버튼을 제공합니다.
 */
export interface ErrorDisplayProps extends BaseComponentProps {
  /** 에러 정보 */
  error: PairingError;
  /** 재시도 핸들러 */
  onRetry?: () => void;
  /** 취소 핸들러 */
  onCancel?: () => void;
}
