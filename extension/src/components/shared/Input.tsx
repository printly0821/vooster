/**
 * 공통 Input 컴포넌트
 *
 * TailwindCSS를 사용한 재사용 가능한 입력 필드 컴포넌트입니다.
 */

import type { InputProps } from '../../types/components';

/**
 * Input 컴포넌트
 *
 * @param props - 입력 필드 Props
 * @returns Input 엘리먼트
 *
 * @example
 * <Input
 *   label="디스플레이 이름"
 *   value={name}
 *   onChange={setName}
 *   placeholder="예: 메인 디스플레이"
 * />
 */
export function Input(props: InputProps) {
  const {
    label,
    value,
    onChange,
    placeholder = '',
    required = false,
    disabled = false,
    error,
    type = 'text',
    className = '',
    testId,
  } = props;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* 라벨 */}
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* 입력 필드 */}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        data-testid={testId}
        className={`
          px-4 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      />

      {/* 에러 메시지 */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
