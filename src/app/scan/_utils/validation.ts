/**
 * 주문번호 형식 검증 유틸리티
 *
 * 주문번호 형식: YYMMDD-XXX-NNNN_NN
 * 예시: 202509-FUJ-0020_00
 *
 * 구조:
 * - YYMMDD: 날짜 (2025년 9월 = 250909)
 * - XXX: 3자리 알파벳 (회사/부서 코드)
 * - NNNN: 4자리 숫자 (시퀀스)
 * - NN: 2자리 숫자 (상세 번호)
 */

/**
 * 주문번호 형식 검증
 *
 * @param barcode - 스캔된 바코드
 * @returns 유효한 주문번호 형식이면 true
 *
 * @example
 * isValidOrderNumber('202509-FUJ-0020_00') // true
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
 */
export function getOrderNumberPattern(): RegExp {
  // YYMMDD-XXX-NNNN_NN
  // 예: 202509-FUJ-0020_00
  return /^\d{6}-[A-Z]{3}-\d{4}_\d{2}$/;
}

/**
 * 주문번호 구조 분석 (디버깅용)
 *
 * @param barcode - 바코드
 * @returns 분석 결과
 *
 * @example
 * analyzeOrderFormat('202509-FUJ-0020_00')
 * // { isValid: true, parts: { date: '202509', code: 'FUJ', sequence: '0020', detail: '00' } }
 */
export function analyzeOrderFormat(barcode: string): {
  isValid: boolean;
  parts?: {
    date: string;
    code: string;
    sequence: string;
    detail: string;
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
      error: `Invalid format. Expected: YYMMDD-XXX-NNNN_NN, Got: ${trimmed}`,
    };
  }

  // 형식: YYMMDD-XXX-NNNN_NN
  const parts = trimmed.split('-');
  const dateCode = parts[0]; // YYMMDD
  const codeSeq = parts[1]; // XXX
  const detailParts = parts[2].split('_'); // NNNN_NN
  const sequence = detailParts[0]; // NNNN
  const detail = detailParts[1]; // NN

  return {
    isValid: true,
    parts: {
      date: dateCode,
      code: codeSeq,
      sequence,
      detail,
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
