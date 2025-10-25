/**
 * Zod 검증 스키마 통합 export
 *
 * 모든 API 검증 스키마를 중앙에서 관리
 */

// 디스플레이 스키마
export {
  displayRegisterSchema,
  type DisplayRegisterInput,
  displayQuerySchema,
  type DisplayQueryInput,
  screenIdSchema,
  type ScreenId,
  parseScreenIdSchema,
  type ParsedScreenId,
} from './display';

// 페어링 스키마
export {
  pairApproveSchema,
  type PairApproveInput,
  pairSessionIdSchema,
  type PairSessionId,
  pairCodeSchema,
  type PairCode,
  pairQRDataSchema,
  type PairQRData,
  parsePairQRDataSchema,
  type ParsedPairQRData,
  pairPollIntervalSchema,
  type PairPollInterval,
} from './pairing';

// 트리거 스키마
export {
  triggerSchema,
  type TriggerInput,
  jobNoSchema,
  type JobNo,
  txIdSchema,
  type TxId,
  triggerMetadataSchema,
  type TriggerMetadata,
  triggerPayloadSchema,
  type TriggerPayload,
  triggerResponseStatusSchema,
  type TriggerResponseStatus,
  triggerFailureReasonSchema,
  type TriggerFailureReason,
  clientCountSchema,
  type ClientCount,
} from './trigger';

// 인증 스키마
export {
  jwtClaimsSchema,
  type JWTClaims,
  scopeSchema,
  type Scope,
  scopesSchema,
  type Scopes,
  bearerTokenSchema,
  type BearerToken,
  userIdSchema,
  type UserId,
  userRoleSchema,
  type UserRole,
  ipAddressSchema,
  type IpAddress,
  authContextSchema,
  type AuthContext,
  rateLimitConfigSchema,
  type RateLimitConfig,
  rateLimitStateSchema,
  type RateLimitState,
  tokenExpirationSchema,
  type TokenExpiration,
} from './auth';
