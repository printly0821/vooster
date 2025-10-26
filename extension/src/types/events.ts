/**
 * Chrome Runtime Message 타입 시스템
 *
 * Content Script와 Service Worker, Popup 간의 메시지 통신을
 * 타입 안전하게 관리합니다. Discriminated Union 패턴으로
 * 메시지 종류별 자동 타입 좁히기를 지원합니다.
 */

/**
 * 메시지 기본 구조 (모든 메시지가 상속해야 함)
 *
 * @template TType - 메시지 타입 식별자
 * @template TPayload - 메시지 페이로드
 */
interface BaseMessage<TType extends string, TPayload = void> {
  /** 메시지 타입 (discriminator) */
  type: TType;
  /** 메시지 고유 ID (응답 매칭용) */
  id?: string;
  /** 페이로드 데이터 */
  payload?: TPayload;
}

// ============================================================================
// 페어링 관련 메시지
// ============================================================================

/**
 * 페어링 시작 요청
 *
 * 사용자가 옵션 페이지에서 페어링을 시작할 때 발송됩니다.
 */
export interface PairingStartMessage extends BaseMessage<'PAIRING_START', { code: string }> {
  type: 'PAIRING_START';
  payload: {
    /** 바코드에서 추출한 페어링 코드 */
    code: string;
  };
}

/**
 * 페어링 완료 응답
 *
 * Service Worker가 페어링 성공을 알립니다.
 */
export interface PairingCompleteMessage
  extends BaseMessage<'PAIRING_COMPLETE', { displayId: string; displayName: string }> {
  type: 'PAIRING_COMPLETE';
  payload: {
    /** 페어링된 디스플레이 ID */
    displayId: string;
    /** 디스플레이 이름 */
    displayName: string;
  };
}

/**
 * 페어링 오류 응답
 *
 * Service Worker가 페어링 실패를 알립니다.
 */
export interface PairingErrorMessage extends BaseMessage<'PAIRING_ERROR', { error: string }> {
  type: 'PAIRING_ERROR';
  payload: {
    /** 오류 메시지 */
    error: string;
  };
}

/**
 * 페어링 취소 요청
 *
 * 사용자가 기존 페어링을 제거할 때 발송됩니다.
 */
export interface PairingCancelMessage extends BaseMessage<'PAIRING_CANCEL'> {
  type: 'PAIRING_CANCEL';
}

// ============================================================================
// 바코드 스캔 관련 메시지
// ============================================================================

/**
 * 바코드 스캔 완료 알림
 *
 * Content Script가 바코드를 감지했음을 알립니다.
 */
export interface BarcodeScannedMessage extends BaseMessage<'BARCODE_SCANNED', { barcode: string }> {
  type: 'BARCODE_SCANNED';
  payload: {
    /** 스캔된 바코드 값 */
    barcode: string;
  };
}

/**
 * 바코드 명령 실행 요청
 *
 * Service Worker가 디스플레이로 바코드 명령을 전송합니다.
 */
export interface BarcodeCommandMessage extends BaseMessage<'BARCODE_COMMAND', { barcode: string }> {
  type: 'BARCODE_COMMAND';
  payload: {
    /** 처리할 바코드 값 */
    barcode: string;
  };
}

// ============================================================================
// WebSocket 연결 관련 메시지
// ============================================================================

/**
 * WebSocket 연결 상태 변경 알림
 *
 * Service Worker가 연결 상태 변화를 알립니다.
 */
export interface ConnectionStatusMessage
  extends BaseMessage<
    'CONNECTION_STATUS',
    { status: 'connected' | 'disconnected' | 'connecting'; reason?: string }
  > {
  type: 'CONNECTION_STATUS';
  payload: {
    /** 연결 상태 */
    status: 'connected' | 'disconnected' | 'connecting';
    /** 상태 변화 이유 (선택사항) */
    reason?: string;
  };
}

/**
 * 강제 재연결 요청
 *
 * Popup이나 Options 페이지에서 즉시 재연결을 요청합니다.
 */
export interface ReconnectMessage extends BaseMessage<'RECONNECT'> {
  type: 'RECONNECT';
}

// ============================================================================
// 설정 관련 메시지
// ============================================================================

/**
 * 설정 조회 요청
 *
 * Popup이 현재 설정값을 조회합니다.
 */
export interface GetSettingsMessage extends BaseMessage<'GET_SETTINGS'> {
  type: 'GET_SETTINGS';
}

/**
 * 설정 조회 응답
 */
export interface GetSettingsResponseMessage
  extends BaseMessage<'GET_SETTINGS_RESPONSE', { settings: Record<string, unknown> }> {
  type: 'GET_SETTINGS_RESPONSE';
  payload: {
    /** 현재 설정값 */
    settings: Record<string, unknown>;
  };
}

/**
 * 설정 변경 요청
 *
 * Popup이 설정을 변경합니다.
 */
export interface UpdateSettingsMessage
  extends BaseMessage<'UPDATE_SETTINGS', { key: string; value: unknown }> {
  type: 'UPDATE_SETTINGS';
  payload: {
    /** 변경할 설정 키 */
    key: string;
    /** 새로운 값 */
    value: unknown;
  };
}

/**
 * 설정 변경 완료 응답
 */
export interface SettingsUpdatedMessage extends BaseMessage<'SETTINGS_UPDATED'> {
  type: 'SETTINGS_UPDATED';
}

// ============================================================================
// 로그 관련 메시지
// ============================================================================

/**
 * 로그 저장 요청
 *
 * Service Worker가 로그를 저장합니다.
 */
export interface LogMessage
  extends BaseMessage<
    'LOG',
    { level: string; message: string; data?: Record<string, unknown> }
  > {
  type: 'LOG';
  payload: {
    /** 로그 레벨 */
    level: string;
    /** 로그 메시지 */
    message: string;
    /** 추가 데이터 */
    data?: Record<string, unknown>;
  };
}

/**
 * 로그 조회 요청
 */
export interface GetLogsMessage extends BaseMessage<'GET_LOGS', { limit?: number }> {
  type: 'GET_LOGS';
  payload?: {
    /** 반환할 최대 로그 개수 */
    limit?: number;
  };
}

/**
 * 로그 조회 응답
 */
export interface GetLogsResponseMessage
  extends BaseMessage<'GET_LOGS_RESPONSE', { logs: Array<{ level: string; message: string; timestamp: string }> }> {
  type: 'GET_LOGS_RESPONSE';
  payload: {
    /** 로그 항목 배열 */
    logs: Array<{
      level: string;
      message: string;
      timestamp: string;
    }>;
  };
}

// ============================================================================
// 상태 조회 메시지
// ============================================================================

/**
 * 페어링 상태 조회 요청
 */
export interface GetPairingStatusMessage extends BaseMessage<'GET_PAIRING_STATUS'> {
  type: 'GET_PAIRING_STATUS';
}

/**
 * 페어링 상태 응답
 */
export interface GetPairingStatusResponseMessage
  extends BaseMessage<
    'GET_PAIRING_STATUS_RESPONSE',
    {
      isPaired: boolean;
      displayId?: string;
      displayName?: string;
    }
  > {
  type: 'GET_PAIRING_STATUS_RESPONSE';
  payload: {
    /** 페어링 상태 */
    isPaired: boolean;
    /** 페어링된 디스플레이 ID */
    displayId?: string;
    /** 디스플레이 이름 */
    displayName?: string;
  };
}

/**
 * 연결 상태 조회 요청
 */
export interface GetConnectionStatusMessage extends BaseMessage<'GET_CONNECTION_STATUS'> {
  type: 'GET_CONNECTION_STATUS';
}

/**
 * 연결 상태 응답
 */
export interface GetConnectionStatusResponseMessage
  extends BaseMessage<'GET_CONNECTION_STATUS_RESPONSE', { status: string }>
{
  type: 'GET_CONNECTION_STATUS_RESPONSE';
  payload: {
    /** WebSocket 연결 상태 */
    status: string;
  };
}

// ============================================================================
// Discriminated Union 정의
// ============================================================================

/**
 * 모든 가능한 Runtime Message의 Union 타입
 *
 * 메시지 핸들러에서 사용하여 타입 안전한
 * 메시지 처리를 구현합니다.
 *
 * @example
 * // Type Guard로 자동 타입 좁히기
 * function handleMessage(message: RuntimeMessage): void {
 *   if (message.type === 'PAIRING_START') {
 *     // 여기서 message는 자동으로 PairingStartMessage 타입
 *     const code = message.payload.code;
 *   }
 * }
 */
export type RuntimeMessage =
  | PairingStartMessage
  | PairingCompleteMessage
  | PairingErrorMessage
  | PairingCancelMessage
  | BarcodeScannedMessage
  | BarcodeCommandMessage
  | ConnectionStatusMessage
  | ReconnectMessage
  | GetSettingsMessage
  | GetSettingsResponseMessage
  | UpdateSettingsMessage
  | SettingsUpdatedMessage
  | LogMessage
  | GetLogsMessage
  | GetLogsResponseMessage
  | GetPairingStatusMessage
  | GetPairingStatusResponseMessage
  | GetConnectionStatusMessage
  | GetConnectionStatusResponseMessage;

/**
 * 메시지 핸들러 함수 타입
 *
 * @template T - 처리할 메시지 타입
 * @template R - 응답 타입
 */
export type MessageHandler<T extends RuntimeMessage, R = void> = (
  message: T,
  sender: chrome.runtime.MessageSender
) => Promise<R> | R;

/**
 * 메시지 핸들러 맵
 *
 * 메시지 타입별 핸들러를 등록합니다.
 */
export interface MessageHandlerMap {
  PAIRING_START: MessageHandler<PairingStartMessage, void>;
  PAIRING_CANCEL: MessageHandler<PairingCancelMessage, void>;
  BARCODE_SCANNED: MessageHandler<BarcodeScannedMessage, void>;
  RECONNECT: MessageHandler<ReconnectMessage, void>;
  GET_SETTINGS: MessageHandler<GetSettingsMessage, unknown>;
  UPDATE_SETTINGS: MessageHandler<UpdateSettingsMessage, void>;
  GET_LOGS: MessageHandler<GetLogsMessage, unknown>;
  GET_PAIRING_STATUS: MessageHandler<GetPairingStatusMessage, unknown>;
  GET_CONNECTION_STATUS: MessageHandler<GetConnectionStatusMessage, unknown>;
}

/**
 * 메시지 타입 가드 함수
 *
 * 런타임 메시지 타입 검증 및 타입 좁히기 헬퍼입니다.
 *
 * @param message - 검사할 메시지
 * @param type - 예상 메시지 타입
 * @returns 타입이 일치하면 true
 *
 * @example
 * if (isMessageType(message, 'PAIRING_START')) {
 *   // message는 PairingStartMessage 타입
 *   const code = message.payload.code;
 * }
 */
export function isMessageType<T extends RuntimeMessage['type']>(
  message: unknown,
  type: T
): message is Extract<RuntimeMessage, { type: T }> {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  return (message as Record<string, unknown>).type === type;
}

/**
 * 메시지 응답 생성 헬퍼
 *
 * 요청 메시지에 대한 응답을 타입 안전하게 생성합니다.
 *
 * @param requestMessage - 요청 메시지
 * @param payload - 응답 페이로드
 * @returns 응답 메시지
 *
 * @example
 * const response = createMessageResponse(
 *   request,
 *   { settings: {...} }
 * );
 */
export function createMessageResponse(
  requestMessage?: Pick<RuntimeMessage, 'id'>,
  payload?: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(payload || {}),
    id: requestMessage?.id,
  };
}
