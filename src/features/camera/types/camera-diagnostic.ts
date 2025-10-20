/**
 * Camera Diagnostic Type System
 *
 * Phase 1: 카메라 물리적 특성 진단 및 불일치 감지
 *
 * 사용자 요구사항:
 * 1. 전면/후면 반대 감지 문제 해결
 * 2. 접사/광각/망원 카메라 구분
 * 3. 바코드 스캔 적합성 평가
 *
 * @module features/camera/types/camera-diagnostic
 * @author 신우진
 * @date 2025-10-20
 */

import type { CameraDevice } from '../types';
import type {
  ExtendedMediaTrackCapabilities,
  ExtendedMediaTrackSettings,
} from './media-extensions';

/**
 * 카메라 타입 (렌즈 분류)
 *
 * 바코드 스캔 적합도 순서: wide > telephoto > ultra-wide > macro
 */
export type CameraType =
  | 'wide'           // 일반 광각 카메라 (바코드 스캔 최적)
  | 'ultra-wide'     // 초광각 카메라 (왜곡 많음, 바코드 부적합)
  | 'telephoto'      // 망원 카메라 (멀리서 스캔 가능)
  | 'macro'          // 접사 카메라 (매우 가까이만, 바코드 부적합)
  | 'depth'          // 깊이 센서 (스캔 불가)
  | 'unknown';       // 알 수 없음

/**
 * 카메라 물리적 특성
 *
 * MediaTrackCapabilities와 Settings에서 추출한 물리적 속성
 */
export interface CameraPhysicalCharacteristics {
  /** 해상도 */
  resolution: {
    width: number;
    height: number;
    megapixels: number; // 계산된 값
  };

  /** 시야각 (Field of View, 도 단위) */
  fov?: number;

  /** 최소 초점 거리 (미터 단위) */
  minFocusDistance?: number;

  /** 최대 초점 거리 (미터 단위, Infinity 가능) */
  maxFocusDistance?: number;

  /** 광학 줌 지원 여부 */
  hasOpticalZoom: boolean;

  /** 줌 범위 */
  zoomRange?: {
    min: number;
    max: number;
  };

  /** 오토포커스 지원 여부 */
  hasAutofocus: boolean;

  /** 지원하는 포커스 모드 */
  focusModes?: ('continuous' | 'manual' | 'single-shot')[];

  /** 프레임레이트 범위 */
  frameRateRange?: {
    min: number;
    max: number;
  };

  /** 종횡비 */
  aspectRatio: number;

  /** 토치(플래시) 지원 여부 */
  hasTorch: boolean;
}

/**
 * 바코드 스캔 적합성 문제 타입
 */
export type BarcodeCompatibilityIssue =
  | 'resolution-too-low'          // 해상도가 너무 낮음 (< 640x480)
  | 'resolution-too-high'         // 해상도가 너무 높음 (처리 부담)
  | 'fov-too-wide'                // 시야각이 너무 넓음 (ultra-wide)
  | 'fov-too-narrow'              // 시야각이 너무 좁음 (telephoto)
  | 'macro-only'                  // 접사 전용 카메라
  | 'no-autofocus'                // 오토포커스 미지원
  | 'focus-distance-limited'      // 초점 거리 제한
  | 'no-continuous-focus'         // 연속 초점 미지원
  | 'low-framerate'               // 프레임레이트 낮음
  | 'no-zoom'                     // 줌 미지원
  | 'unknown-capabilities';       // capabilities 정보 부족

/**
 * 바코드 스캔 적합성 평가
 */
export interface BarcodeCompatibilityAssessment {
  /** 적합도 점수 (0-100) */
  score: number;

  /** 바코드 스캔에 최적인 카메라인지 */
  isOptimal: boolean;

  /** 문제점 목록 */
  issues: BarcodeCompatibilityIssue[];

  /** 권장사항 */
  recommendation: string;

  /** 점수 산정 근거 */
  scoreBreakdown: {
    resolutionScore: number;      // 해상도 점수 (0-25)
    focusScore: number;            // 초점 기능 점수 (0-30)
    fovScore: number;              // 시야각 점수 (0-20)
    zoomScore: number;             // 줌 기능 점수 (0-15)
    autofocusScore: number;        // 오토포커스 점수 (0-10)
  };
}

/**
 * 카메라 진단 결과
 *
 * label 추론 vs stream 실제 값 비교 결과
 */
export interface CameraDiagnosticResult {
  /** 진단 대상 디바이스 ID */
  deviceId: string;

  /** 디바이스 라벨 */
  deviceLabel: string;

  /** 진단 성공 여부 */
  success: boolean;

  /** 진단 시작 시각 (Unix timestamp) */
  startedAt: number;

  /** 진단 완료 시각 */
  completedAt: number;

  /** 진단 소요 시간 (ms) */
  durationMs: number;

  /** ===== Label 기반 추론 ===== */
  inferred: {
    /** label에서 추론한 facing mode */
    facingMode: 'user' | 'environment' | 'unknown';

    /** label에서 추론한 카메라 타입 */
    cameraType: CameraType;

    /** 추론 신뢰도 (0-1) */
    confidence: number;
  };

  /** ===== Stream 기반 실제 값 ===== */
  actual: {
    /** stream.getSettings()에서 얻은 실제 facing mode */
    facingMode: 'user' | 'environment' | 'unknown';

    /** capabilities 분석으로 결정한 실제 카메라 타입 */
    cameraType: CameraType;

    /** 실제 물리적 특성 */
    physicalCharacteristics: CameraPhysicalCharacteristics;
  };

  /** ===== 불일치 감지 ===== */
  mismatch: {
    /** facing mode 불일치 여부 */
    facingMode: boolean;

    /** 카메라 타입 불일치 여부 */
    cameraType: boolean;

    /** 불일치 심각도 */
    severity: 'none' | 'minor' | 'major' | 'critical';
  };

  /** ===== 바코드 스캔 적합성 ===== */
  barcodeCompatibility: BarcodeCompatibilityAssessment;

  /** MediaTrackCapabilities (원본) */
  capabilities?: ExtendedMediaTrackCapabilities;

  /** MediaTrackSettings (원본) */
  settings?: ExtendedMediaTrackSettings;

  /** 진단 에러 (실패 시) */
  error?: {
    code: string;
    message: string;
    originalError?: Error;
  };
}

/**
 * 진단 진행 상태
 */
export interface DiagnosticProgress {
  /** 현재 진단 중인 인덱스 (0부터 시작) */
  current: number;

  /** 전체 디바이스 수 */
  total: number;

  /** 완료된 수 */
  completed: number;

  /** 실패한 수 */
  failed: number;

  /** 진행률 (0-100) */
  percentage: number;

  /** 예상 남은 시간 (ms) */
  estimatedRemainingMs?: number;
}

/**
 * 카메라 타입 설명 (다국어 지원)
 */
export interface CameraTypeDescription {
  ko: string;
  en: string;
}

/**
 * 카메라 타입별 설명
 */
export const CAMERA_TYPE_DESCRIPTIONS: Record<CameraType, CameraTypeDescription> = {
  'wide': {
    ko: '일반 카메라 (바코드 스캔 권장)',
    en: 'Wide-angle Camera (Recommended for Barcode)',
  },
  'ultra-wide': {
    ko: '초광각 카메라 (바코드 스캔 비권장)',
    en: 'Ultra-wide Camera (Not recommended)',
  },
  'telephoto': {
    ko: '망원 카메라 (멀리서 스캔 시 유용)',
    en: 'Telephoto Camera (Useful for distant scanning)',
  },
  'macro': {
    ko: '접사 카메라 (매우 가까이서만 초점)',
    en: 'Macro Camera (Very close focus only)',
  },
  'depth': {
    ko: '깊이 센서 (스캔 불가)',
    en: 'Depth Sensor (Cannot scan)',
  },
  'unknown': {
    ko: '알 수 없는 카메라',
    en: 'Unknown Camera',
  },
} as const;

/**
 * 카메라 타입 우선순위 (바코드 스캔 기준)
 *
 * 숫자가 낮을수록 높은 우선순위
 */
export const CAMERA_TYPE_PRIORITY: Record<CameraType, number> = {
  'wide': 1,
  'telephoto': 2,
  'ultra-wide': 3,
  'macro': 4,
  'depth': 5,
  'unknown': 6,
} as const;

/**
 * 카메라 타입별 이모지 아이콘
 */
export const CAMERA_TYPE_ICONS: Record<CameraType, string> = {
  'wide': '📷',
  'ultra-wide': '📐',
  'telephoto': '🔭',
  'macro': '🔬',
  'depth': '📊',
  'unknown': '❓',
} as const;
