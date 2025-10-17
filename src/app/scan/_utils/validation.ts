/**
 * 주문번호 형식 검증 유틸리티
 *
 * 주문번호 형식: YYMMDD-CompanyCode-Numbers
 *
 * 예시:
 * - 202509-FUJ-0020_00
 * - 202510-BIZ-00804_00
 * - 202510-SW-1234
 * - 202510-Fuji-0020_00
 * - 202510-Continue-12345-67
 *
 * 구조:
 * - YYMMDD: 날짜 (6자리 숫자, 예: 202510 = 2025년 10월)
 * - CompanyCode: 회사/부서 코드 (가변 길이 알파벳, 대소문자 허용)
 * - Numbers: 숫자, 하이픈, 언더스코어 조합 (가변 길이)
 */

/**
 * 주문번호 형식 검증
 *
 * @param barcode - 스캔된 바코드
 * @returns 유효한 주문번호 형식이면 true
 *
 * @example
 * isValidOrderNumber('202509-FUJ-0020_00') // true
 * isValidOrderNumber('202510-SW-1234') // true
 * isValidOrderNumber('202510-Fuji-0020_00') // true
 * isValidOrderNumber('202510-Continue-12345-67') // true
 * isValidOrderNumber('INVALID') // false
 */
export function isValidOrderNumber(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  const pattern = getOrderNumberPattern();
  return pattern.test(barcode.trim());
}

/**
 * 주문번호 형식 정규식 패턴 반환
 *
 * @returns RegExp 패턴
 *
 * @description
 * 패턴: YYMMDD-CompanyCode-Numbers
 * - YYMMDD: 6자리 숫자
 * - CompanyCode: 1글자 이상의 알파벳 (대소문자)
 * - Numbers: 숫자, 하이픈(-), 언더스코어(_) 조합
 */
export function getOrderNumberPattern(): RegExp {
  // YYMMDD-CompanyCode-Numbers
  // 예: 202510-SW-1234, 202510-Fuji-0020_00, 202510-Continue-12345-67
  return /^\d{6}-[A-Za-z]+-[\d\-_]+$/;
}

/**
 * 주문번호 구조 분석 (디버깅용)
 *
 * @param barcode - 바코드
 * @returns 분석 결과
 *
 * @example
 * analyzeOrderFormat('202509-FUJ-0020_00')
 * // { isValid: true, parts: { date: '202509', code: 'FUJ', numbers: '0020_00' } }
 *
 * analyzeOrderFormat('202510-Continue-12345-67')
 * // { isValid: true, parts: { date: '202510', code: 'Continue', numbers: '12345-67' } }
 */
export function analyzeOrderFormat(barcode: string): {
  isValid: boolean;
  parts?: {
    date: string;
    code: string;
    numbers: string;
  };
  error?: string;
} {
  if (!barcode || typeof barcode !== 'string') {
    return {
      isValid: false,
      error: 'Barcode must be a non-empty string',
    };
  }

  const trimmed = barcode.trim();
  const pattern = getOrderNumberPattern();

  if (!pattern.test(trimmed)) {
    return {
      isValid: false,
      error: `Invalid format. Expected: YYMMDD-CompanyCode-Numbers, Got: ${trimmed}`,
    };
  }

  // 형식: YYMMDD-CompanyCode-Numbers
  const parts = trimmed.split('-');
  const dateCode = parts[0]!; // YYMMDD (6자리) - 정규식 검증 통과 후이므로 안전
  const companyCode = parts[1]!; // CompanyCode (가변 길이 알파벳) - 정규식 검증 통과 후이므로 안전
  const numbers = parts.slice(2).join('-'); // 나머지 모두 (숫자, -, _)

  return {
    isValid: true,
    parts: {
      date: dateCode,
      code: companyCode,
      numbers,
    },
  };
}

/**
 * 주문번호 날짜 유효성 검증 (선택사항)
 *
 * @param barcode - 바코드
 * @returns 날짜가 유효하면 true
 *
 * @example
 * isValidOrderDate('202509-FUJ-0020_00') // true
 * isValidOrderDate('209999-FUJ-0020_00') // false (invalid month)
 */
export function isValidOrderDate(barcode: string): boolean {
  const analysis = analyzeOrderFormat(barcode);

  if (!analysis.isValid || !analysis.parts) {
    return false;
  }

  const { date } = analysis.parts;
  const year = parseInt(date.substring(0, 2), 10);
  const month = parseInt(date.substring(2, 4), 10);
  const day = parseInt(date.substring(4, 6), 10);

  // 월 검증 (01-12)
  if (month < 1 || month > 12) {
    return false;
  }

  // 일 검증 (01-31)
  if (day < 1 || day > 31) {
    return false;
  }

  // 연도 검증 (20-29, 즉 2000-2099년)
  if (year < 0 || year > 99) {
    return false;
  }

  return true;
}

/**
 * 디버그 로깅
 *
 * @param barcode - 바코드
 * @param isValid - 유효 여부
 */
export function logBarcodeValidation(barcode: string, isValid: boolean): void {
  if (isValid) {
    const analysis = analyzeOrderFormat(barcode);
    console.log(`✅ 유효한 주문번호: ${barcode}`, analysis.parts);
  } else {
    console.warn(`❌ 무효한 바코드 (형식 불일치): ${barcode}`);
  }
}
