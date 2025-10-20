/**
 * Camera Classification Type System
 *
 * Phase 2: 진단 결과를 기반으로 카메라를 분류하는 타입
 *
 * @module features/camera/types/camera-classification
 * @author 신우진
 * @date 2025-10-20
 */

import type { CameraDevice } from '../types';
import type { CameraDiagnosticResult, CameraType } from './camera-diagnostic';

/**
 * 확장된 CameraDevice (진단 정보 포함)
 *
 * 기존 CameraDevice에 진단 및 분류 정보를 추가
 */
export interface EnhancedCameraDevice extends CameraDevice {
  /** Phase 1 진단 결과 */
  diagnostic?: CameraDiagnosticResult;

  /** Phase 2 분류 정보 */
  classification?: CameraClassification;

  /** Phase 3 사용자 캘리브레이션 */
  calibration?: DeviceCalibration;

  /** Phase 4 바코드 스캔 점수 (빠른 참조용) */
  barcodeScore?: number;

  /** 보정된 facing mode (캘리브레이션 or 진단 결과) */
  correctedFacing?: 'user' | 'environment';

  /** 확정된 카메라 타입 */
  cameraType?: CameraType;
}

/**
 * 카메라 분류 정보
 *
 * 진단 결과를 종합하여 최종 분류 결정
 */
export interface CameraClassification {
  /** 최종 확정된 facing mode */
  confirmedFacingMode: 'user' | 'environment' | 'unknown';

  /** 최종 확정된 카메라 타입 */
  confirmedType: CameraType;

  /** 분류 신뢰도 (0-1) */
  confidence: number;

  /** 분류 방법 */
  classificationMethod: ClassificationMethod;

  /** 분류 타임스탬프 */
  classifiedAt: number;

  /** 경고 메시지 (있는 경우) */
  warnings: ClassificationWarning[];
}

/**
 * 분류 방법
 */
export type ClassificationMethod =
  | 'label-only'              // label만으로 추론 (stream 없음)
  | 'stream-corrected'        // stream으로 보정
  | 'capabilities-analyzed'   // capabilities 상세 분석
  | 'user-calibrated'         // 사용자 수동 보정
  | 'fallback';               // 기본값 사용 (정보 부족)

/**
 * 분류 경고
 */
export interface ClassificationWarning {
  type: ClassificationWarningType;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * 분류 경고 타입
 */
export type ClassificationWarningType =
  | 'label-stream-mismatch'       // label과 stream 불일치
  | 'capabilities-unavailable'    // capabilities 정보 없음
  | 'ambiguous-camera-type'       // 카메라 타입 모호함
  | 'low-confidence'              // 낮은 신뢰도
  | 'deprecated-device'           // 구형 디바이스
  | 'unusual-characteristics';    // 비정상적 특성

/**
 * 카메라 그룹 (facing mode별)
 */
export interface CameraGroups {
  /** 전면 카메라 목록 */
  front: EnhancedCameraDevice[];

  /** 후면 카메라 목록 (타입별 정렬) */
  back: CameraBackGroup;

  /** 불명확한 카메라 */
  unknown: EnhancedCameraDevice[];

  /** 전체 통계 */
  stats: CameraGroupStats;
}

/**
 * 후면 카메라 그룹 (타입별 세분화)
 */
export interface CameraBackGroup {
  /** 일반 광각 (바코드 스캔 최적) */
  wide: EnhancedCameraDevice[];

  /** 초광각 */
  ultraWide: EnhancedCameraDevice[];

  /** 망원 */
  telephoto: EnhancedCameraDevice[];

  /** 접사 */
  macro: EnhancedCameraDevice[];

  /** 기타 */
  other: EnhancedCameraDevice[];
}

/**
 * 카메라 그룹 통계
 */
export interface CameraGroupStats {
  /** 전체 카메라 수 */
  total: number;

  /** 전면 카메라 수 */
  frontCount: number;

  /** 후면 카메라 수 */
  backCount: number;

  /** 후면 카메라 중 바코드 스캔 최적 카메라 수 */
  backOptimalCount: number;

  /** 분류 완료된 카메라 비율 */
  classificationCompleteness: number; // 0-1

  /** 평균 분류 신뢰도 */
  averageConfidence: number; // 0-1
}

/**
 * 디바이스 캘리브레이션 (임시 정의, Phase 3에서 완전 정의)
 */
export interface DeviceCalibration {
  deviceId: string;
  deviceLabel: string;
  userCorrectedFacing?: 'user' | 'environment';
  userCorrectedType?: CameraType;
  calibratedAt: number;
  calibrationMethod: 'user-manual' | 'auto-detection';
  confidence: number;
}
