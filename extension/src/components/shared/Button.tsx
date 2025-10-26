/**
 * 공통 Button 컴포넌트
 *
 * TailwindCSS를 사용한 재사용 가능한 버튼 컴포넌트입니다.
 */

import type { ButtonProps } from '../../types/components';

/**
 * Button 컴포넌트
 *
 * @param props - 버튼 Props
 * @returns Button 엘리먼트
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>
 *   클릭
 * </Button>
 */
export function Button(props: ButtonProps) {
  const {
    children,
    variant = 'primary',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    className = '',
    testId,
  } = props;

  // 스타일 매핑
  const variantStyles: Record<string, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  // 기본 스타일
  const baseStyles =
    'px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  // 최종 클래스명
  const finalClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  return (
    <button
      type={type}
      className={finalClassName}
      disabled={disabled || loading}
      onClick={onClick}
      data-testid={testId}
    >
      {loading ? '로딩 중...' : children}
    </button>
  );
}
