/**
 * 디스플레이 정보 입력 폼 컴포넌트
 *
 * 페어링 플로우의 첫 단계로, 디스플레이 이름을 입력받습니다.
 */

import { useState } from 'preact/hooks';
import type { DisplayInfoFormProps } from '../../types/components';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';

/**
 * DisplayInfoForm 컴포넌트
 *
 * @param props - 폼 Props
 * @returns 디스플레이 정보 입력 폼
 *
 * @example
 * <DisplayInfoForm
 *   displayName={name}
 *   onDisplayNameChange={setName}
 *   onSubmit={handleSubmit}
 *   loading={false}
 * />
 */
export function DisplayInfoForm(props: DisplayInfoFormProps) {
  const {
    displayName,
    onDisplayNameChange,
    onSubmit,
    loading,
    error,
    className = '',
    testId,
  } = props;

  // 로컬 검증 상태
  const [validationError, setValidationError] = useState<string | undefined>();

  /**
   * 폼 제출 핸들러
   *
   * @param e - 폼 이벤트
   */
  function handleSubmit(e: Event): void {
    e.preventDefault();

    // 검증: 디스플레이 이름이 비어있는지 확인
    if (!displayName.trim()) {
      setValidationError('디스플레이 이름을 입력해주세요.');
      return;
    }

    // 검증: 최소 2자 이상
    if (displayName.trim().length < 2) {
      setValidationError('디스플레이 이름은 최소 2자 이상이어야 합니다.');
      return;
    }

    // 검증 통과 -> 제출
    setValidationError(undefined);
    onSubmit();
  }

  return (
    <div
      className={`max-w-md mx-auto p-6 bg-white rounded-lg shadow-md ${className}`}
      data-testid={testId}
    >
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          디스플레이 설정
        </h2>
        <p className="text-gray-600">
          이 디바이스를 구분할 이름을 입력해주세요.
        </p>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="디스플레이 이름"
          value={displayName}
          onChange={(value) => {
            onDisplayNameChange(value);
            setValidationError(undefined);
          }}
          placeholder="예: 메인 디스플레이"
          required
          disabled={loading}
          error={validationError}
          testId="display-name-input"
        />

        {/* API 에러 표시 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error.message}</p>
          </div>
        )}

        {/* 제출 버튼 */}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading || !displayName.trim()}
          testId="submit-button"
        >
          다음
        </Button>
      </form>

      {/* 안내 메시지 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 모바일 앱에서 QR 코드를 스캔하여 이 디스플레이를 제어할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
