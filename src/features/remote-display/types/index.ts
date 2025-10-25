/**
 * 원격 디스플레이 타입 및 스키마 통합 export
 */

// 디스플레이 타입
export type {
  Display,
  DisplayStatus,
  DisplayFilterOptions,
  DisplaySortBy,
  SortOrder,
} from './display';

// 페어링 타입
export type {
  QRCodePayload,
  PairingStatus,
  PairingSession,
  PairingMode,
} from './pairing';

// API 타입
export type {
  DisplayListResponse,
  PairingApprovalRequest,
  PairingApprovalResponse,
  PairingApprovalErrorResponse,
  QRCodeGenerationResponse,
  PairingPollSuccessResponse,
  PairingPollPendingResponse,
  PairingPollResponse,
  DisplayListQueryParams,
} from './api';

// localStorage 타입
export type { PairedDisplayData, StorageKey } from './storage';

export { STORAGE_KEYS } from './storage';

// 컴포넌트 Props 타입
export type {
  DisplayCardProps,
  ConfirmModalProps,
  DisplayListProps,
  PairingScannerProps,
  CurrentPairingStatusProps,
  DisplaysDrawerProps,
} from './components';

// 에러 타입
export {
  RemoteDisplayErrorCode,
  RemoteDisplayError,
  PairingError,
  isRemoteDisplayError,
  isPairingError,
} from './error';
