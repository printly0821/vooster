/**
 * 페어링 세션 저장소 인터페이스
 *
 * QR 기반 WeChat 스타일 페어링 세션의 CRUD 작업을 추상화합니다
 */

import { PairingSession } from '../../types/pairing';

/**
 * 페어링 세션 저장소 인터페이스
 */
export interface IPairingRepository {
  /**
   * 새로운 페어링 세션을 생성합니다
   *
   * @param sessionId - 세션 ID (UUID)
   * @param code - 6자리 확인 코드
   * @param expiresAt - 만료 시간 (5분 후)
   * @returns 생성된 세션 정보
   */
  create(sessionId: string, code: string, expiresAt: Date): Promise<PairingSession>;

  /**
   * 세션 ID로 페어링 세션을 조회합니다
   *
   * @param sessionId - 세션 ID
   * @returns 세션 정보 또는 null (없거나 만료됨)
   */
  findById(sessionId: string): Promise<PairingSession | null>;

  /**
   * 세션 ID와 코드로 페어링 세션을 조회합니다
   *
   * @param sessionId - 세션 ID
   * @param code - 6자리 확인 코드
   * @returns 세션 정보 또는 null (일치하지 않거나 만료됨)
   */
  findBySessionAndCode(sessionId: string, code: string): Promise<PairingSession | null>;

  /**
   * 페어링을 승인합니다 (status를 approved로 변경)
   *
   * @param sessionId - 세션 ID
   * @param token - 발급된 JWT 토큰
   * @param approvedBy - 승인한 사용자 ID
   * @param deviceId - 디바이스 ID
   * @param orgId - 조직 ID
   * @param lineId - 라인 ID
   * @returns 업데이트 성공 여부
   */
  approve(
    sessionId: string,
    token: string,
    approvedBy: string,
    deviceId: string,
    orgId: string,
    lineId: string
  ): Promise<boolean>;

  /**
   * 만료된 세션을 정리합니다
   *
   * @returns 삭제된 세션 수
   */
  cleanupExpired(): Promise<number>;
}
