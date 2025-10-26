/**
 * Chrome Storage API 래퍼 유틸리티
 *
 * chrome.storage.local API를 타입 안전한 방식으로 사용하는
 * 헬퍼 함수들을 제공합니다. 자동 에러 처리와 기본값 관리를
 * 포함합니다.
 */

import type {
  StorageSchema,
  StorageKey,
  InstallInfo,
  PairingInfo,
  UserSettings,
  RuntimeState,
  LogEntry,
} from '../types/storage.js';
import { EXTENSION_VERSION, DEFAULT_SETTINGS, DEFAULT_RUNTIME_STATE } from '../types/storage.js';

/**
 * 단일 저장소 항목 조회 (타입 안전)
 *
 * 지정한 키의 저장된 값을 조회합니다.
 * 저장된 값이 없으면 null을 반환합니다.
 *
 * @param key - 조회할 저장소 키 (자동 완성 지원)
 * @returns 저장된 값 또는 null
 * @throws Storage API 오류 시 에러 로깅 후 null 반환
 *
 * @example
 * // 페어링 정보 조회
 * const pairing = await getConfig<PairingInfo>('pairing');
 * if (pairing?.isPaired) {
 *   console.log('Connected to:', pairing.displayName);
 * }
 */
export async function getConfig<K extends StorageKey<keyof StorageSchema>>(
  key: K
): Promise<StorageSchema[K] | null> {
  try {
    const result = await chrome.storage.local.get(key);

    // 저장된 값이 있으면 반환, 없으면 null
    if (key in result) {
      return result[key] as StorageSchema[K];
    }

    return null;
  } catch (error) {
    // 에러 로깅 (Service Worker 콘솔)
    console.error(`[Storage] Failed to get config '${key}':`, error);
    return null;
  }
}

/**
 * 단일 저장소 항목 설정 (타입 안전)
 *
 * 지정한 키에 값을 저장합니다.
 * 기존 값은 덮어씌워집니다.
 *
 * @param key - 설정할 저장소 키
 * @param value - 저장할 값
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * // 페어링 정보 저장
 * await setConfig('pairing', {
 *   isPaired: true,
 *   displayId: 'disp-123',
 *   displayName: 'Office Monitor',
 *   pairedAt: Date.now(),
 * });
 */
export async function setConfig<K extends StorageKey<keyof StorageSchema>>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  try {
    // 타입 안전한 객체 생성
    const data = { [key]: value } as Record<K, StorageSchema[K]>;
    await chrome.storage.local.set(data);
  } catch (error) {
    console.error(`[Storage] Failed to set config '${key}':`, error);
    throw new Error(`Failed to save ${String(key)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 저장소 항목 제거
 *
 * 지정한 키의 저장된 값을 삭제합니다.
 * 이미 없는 키를 삭제해도 에러가 발생하지 않습니다.
 *
 * @param key - 삭제할 저장소 키
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * // 페어링 정보 삭제
 * await removeConfig('pairing');
 */
export async function removeConfig(key: StorageKey<keyof StorageSchema>): Promise<void> {
  try {
    await chrome.storage.local.remove(key);
  } catch (error) {
    console.error(`[Storage] Failed to remove config '${key}':`, error);
    throw new Error(`Failed to remove ${String(key)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 여러 저장소 항목 한번에 조회
 *
 * 여러 키의 값을 한 번에 조회합니다.
 * 없는 키는 응답에 포함되지 않습니다.
 *
 * @param keys - 조회할 저장소 키 배열
 * @returns 조회된 키-값 쌍 객체
 * @throws Storage API 오류 시 빈 객체 반환
 *
 * @example
 * const result = await getConfigs('pairing', 'settings');
 */
export async function getConfigs(
  ...keys: Array<StorageKey<keyof StorageSchema>>
): Promise<Partial<StorageSchema>> {
  try {
    const result = await chrome.storage.local.get(keys);
    return result as Partial<StorageSchema>;
  } catch (error) {
    console.error(`[Storage] Failed to get multiple configs:`, error);
    return {};
  }
}

/**
 * 여러 저장소 항목 한번에 설정
 *
 * 여러 키-값 쌍을 한 번에 저장합니다.
 * 기존 값들은 덮어씌워집니다.
 *
 * @param data - 저장할 키-값 쌍 객체
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * await setConfigs({
 *   pairing: { isPaired: true, displayId: 'disp-123' },
 *   settings: { autoScanEnabled: true },
 * });
 */
export async function setConfigs(data: Partial<StorageSchema>): Promise<void> {
  try {
    await chrome.storage.local.set(data);
  } catch (error) {
    console.error(`[Storage] Failed to set multiple configs:`, error);
    throw new Error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 기본값과 함께 저장소 항목 조회
 *
 * 저장된 값이 없으면 기본값을 반환합니다.
 *
 * @param key - 조회할 저장소 키
 * @param defaultValue - 없을 때 반환할 기본값
 * @returns 저장된 값 또는 기본값
 *
 * @example
 * const settings = await getConfigWithDefault('settings', DEFAULT_SETTINGS);
 */
export async function getConfigWithDefault<K extends StorageKey<keyof StorageSchema>>(
  key: K,
  defaultValue: StorageSchema[K]
): Promise<StorageSchema[K]> {
  const value = await getConfig(key);
  return value ?? defaultValue;
}

/**
 * 저장소 초기화 (설치 시 호출)
 *
 * 확장 설치 시 필요한 기본 설정을 초기화합니다.
 * 기존 데이터는 유지됩니다.
 *
 * @param installReason - 설치 이유 ('install', 'update' 등)
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * // Service Worker onInstalled 이벤트에서 호출
 * await initializeStorage('install');
 */
export async function initializeStorage(installReason: string): Promise<void> {
  try {
    // 현재 설정 상태 조회
    const existing = await getConfigs('installInfo', 'settings', 'runtimeState', 'pairing', 'logs');

    // 설치 정보가 없으면 생성
    const installInfo: InstallInfo = (existing.installInfo as InstallInfo | undefined) || {
      version: EXTENSION_VERSION,
      installTime: Date.now(),
    };

    // 업데이트 시간 갱신
    if (installReason === 'update') {
      installInfo.lastUpdateTime = Date.now();
    }

    // 페어링 정보는 유지하되, 없으면 기본값
    const pairing: PairingInfo = (existing.pairing as PairingInfo | undefined) || {
      isPaired: false,
    };

    // 설정은 기본값과 병합 (기존 값 우선)
    // 1. 기본값에서 시작
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      // 2. 기존 설정으로 덮어쓰기
      ...(existing.settings as Partial<UserSettings> | undefined || {}),
    };

    // 런타임 상태는 초기화 (메모리 기반이므로 매번 새로 생성)
    const runtimeState: RuntimeState = {
      ...DEFAULT_RUNTIME_STATE,
    };

    // 모든 설정을 한번에 저장
    await setConfigs({
      installInfo,
      pairing,
      settings,
      runtimeState,
      logs: (existing.logs as LogEntry[] | undefined) || [],
    });

    console.log(`[Storage] Initialized for '${installReason}':`, {
      version: installInfo.version,
      isPaired: pairing.isPaired,
    });
  } catch (error) {
    console.error('[Storage] Initialization failed:', error);
    throw new Error(`Storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 저장소 전체 조회 (디버깅용)
 *
 * 저장소의 모든 데이터를 조회합니다.
 * 개발 중 디버깅 목적으로만 사용합니다.
 *
 * @returns 전체 저장소 데이터
 *
 * @example
 * const allData = await getAllStorage();
 * console.log('Storage dump:', allData);
 */
export async function getAllStorage(): Promise<StorageSchema> {
  try {
    const result = await chrome.storage.local.get(null);
    return result as StorageSchema;
  } catch (error) {
    console.error('[Storage] Failed to get all data:', error);
    return {};
  }
}

/**
 * 저장소 초기화 (모든 데이터 삭제)
 *
 * 저장소의 모든 데이터를 삭제합니다.
 * 이 작업은 되돌릴 수 없으므로 주의하세요.
 *
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * // 테스트 또는 초기화 시에만 사용
 * await clearStorage();
 */
export async function clearStorage(): Promise<void> {
  try {
    await chrome.storage.local.clear();
    console.log('[Storage] All data cleared');
  } catch (error) {
    console.error('[Storage] Failed to clear storage:', error);
    throw new Error(`Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 로그 항목 추가
 *
 * 저장소의 로그 배열에 새 항목을 추가합니다.
 * 로그는 최대 100개까지만 유지됩니다.
 *
 * @param entry - 추가할 로그 항목
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * await addLog({
 *   level: 'info',
 *   message: 'Connected to display',
 *   source: 'WebSocket',
 *   timestamp: new Date().toISOString(),
 * });
 */
export async function addLog(entry: LogEntry): Promise<void> {
  try {
    const logs = await getConfig('logs');
    const newLogs = [...(logs || []), entry];

    // 최대 100개 유지 (최신 항목 우선)
    if (newLogs.length > 100) {
      newLogs.shift();
    }

    await setConfig('logs', newLogs);
  } catch (error) {
    console.error('[Storage] Failed to add log:', error);
    // 로그 추가 실패는 치명적이지 않으므로 throw하지 않음
  }
}

/**
 * 페어링 정보 설정 헬퍼
 *
 * 페어링 정보를 타입 안전하게 설정합니다.
 * 기존 값과 병합됩니다.
 *
 * @param pairing - 설정할 페어링 정보 (부분 업데이트 가능)
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * await setPairing({
 *   isPaired: true,
 *   displayId: 'disp-123',
 *   displayName: 'Office Monitor',
 * });
 */
export async function setPairing(pairing: Partial<PairingInfo>): Promise<void> {
  try {
    const existing = await getConfig('pairing');
    const updated: PairingInfo = { ...(existing || { isPaired: false }), ...pairing };
    await setConfig('pairing', updated);
  } catch (error) {
    console.error('[Storage] Failed to set pairing:', error);
    throw new Error(`Failed to save pairing info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 사용자 설정 업데이트 헬퍼
 *
 * 사용자 설정의 특정 항목만 업데이트합니다.
 *
 * @param key - 업데이트할 설정 키
 * @param value - 새로운 값
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * await updateSetting('autoScanEnabled', false);
 */
export async function updateSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<void> {
  try {
    const settings = await getConfigWithDefault('settings', DEFAULT_SETTINGS);
    if (!settings) {
      throw new Error('Settings not available');
    }
    settings[key] = value;
    await setConfig('settings', settings);
  } catch (error) {
    console.error(`[Storage] Failed to update setting '${String(key)}':`, error);
    throw new Error(
      `Failed to update setting: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 런타임 상태 업데이트 헬퍼
 *
 * 런타임 상태의 특정 항목만 업데이트합니다.
 *
 * @param key - 업데이트할 상태 키
 * @param value - 새로운 값
 * @throws Storage API 오류 시 에러 로깅
 *
 * @example
 * await updateRuntimeState('wsConnectionStatus', 'connected');
 */
export async function updateRuntimeState<K extends keyof RuntimeState>(
  key: K,
  value: RuntimeState[K]
): Promise<void> {
  try {
    const state = await getConfigWithDefault('runtimeState', DEFAULT_RUNTIME_STATE);
    if (!state) {
      throw new Error('Runtime state not available');
    }
    state[key] = value;
    await setConfig('runtimeState', state);
  } catch (error) {
    console.error(`[Storage] Failed to update runtime state '${String(key)}':`, error);
    throw new Error(
      `Failed to update runtime state: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
