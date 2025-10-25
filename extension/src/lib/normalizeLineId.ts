/**
 * 라인 ID 정규화 유틸리티
 *
 * 사용자 입력값을 서버 Zod 스키마 검증 규칙에 맞게 변환합니다.
 * 서버는 lineId를 소문자, 숫자, 하이픈만 허용합니다.
 */

/**
 * 라인 ID를 서버 스키마 규칙에 맞게 정규화
 *
 * 변환 규칙:
 * 1. 한글, 특수문자 제거 (영문, 숫자, 하이픈, 언더스코어만 유지)
 * 2. 언더스코어를 하이픈으로 변환
 * 3. 영문을 소문자로 변환
 * 4. 연속된 하이픈을 단일 하이픈으로 변환
 * 5. 시작/끝의 하이픈 제거
 * 6. 결과가 비어있으면 기본값 반환
 *
 * @param input - 원본 문자열 (사용자 입력)
 * @returns 정규화된 라인 ID
 *
 * @example
 * normalizeLineId("생산자-001") // "001"
 * normalizeLineId("Test_Line") // "test-line"
 * normalizeLineId("My Display") // "my-display"
 * normalizeLineId("생산자A") // "a"
 * normalizeLineId("!!!") // "default-line"
 */
export function normalizeLineId(input: string): string {
  // 1. 한글, 특수문자 제거 (영문, 숫자, 하이픈, 언더스코어만 유지)
  let normalized = input
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    // 2. 언더스코어를 하이픈으로 변환
    .replace(/_/g, '-')
    // 3. 영문을 소문자로 변환
    .toLowerCase()
    // 4. 연속된 하이픈을 단일 하이픈으로 변환
    .replace(/-+/g, '-')
    // 5. 시작/끝의 하이픈 제거
    .replace(/^-+|-+$/g, '');

  // 6. 결과가 비어있으면 기본값 반환
  if (!normalized) {
    return 'default-line';
  }

  return normalized;
}

/**
 * 라인 ID 정규화 테스트 케이스
 *
 * 각 테스트는 (입력, 예상_출력) 형태입니다.
 * 주의: 공백과 특수문자는 제거되므로 테스트 케이스 작성 시 주의 필요
 */
export const normalizeLineIdTestCases = [
  // 한글 제거
  ('생산자-001', '001'),
  ('생산자A', 'a'),
  ('제조라인', 'default-line'),

  // 영문 소문자 변환
  ('Test_Line', 'test-line'),
  ('MyDisplay', 'mydisplay'), // 공백 없음
  ('TEST', 'test'),

  // 특수문자 제거
  ('Line@1', 'line1'),
  ('Pro#duct', 'product'),
  ('Item!@#', 'item'),

  // 하이픈/언더스코어 처리
  ('test-line', 'test-line'),
  ('test_line', 'test-line'),
  ('test--line', 'test-line'),
  ('test__line', 'test-line'),
  ('-test-line-', 'test-line'),

  // 빈 문자열 및 예외
  ('', 'default-line'),
  ('!!!', 'default-line'),
  ('   ', 'default-line'),

  // 숫자만
  ('001', '001'),
  ('123-456', '123-456'),

  // 혼합
  ('Line-01_테스트', 'line-01'),
  ('ProductionLine1', 'productionline1'), // 공백과 특수문자 제거
  ('라인_A_01', 'a-01'),
];

/**
 * 정규화 테스트 실행
 *
 * @returns 성공한 테스트 수, 실패한 테스트 수
 *
 * @example
 * const { passed, failed } = runNormalizeLineIdTests();
 * console.log(`Passed: ${passed}, Failed: ${failed}`);
 */
export function runNormalizeLineIdTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  for (const [input, expected] of normalizeLineIdTestCases) {
    const result = normalizeLineId(input);
    if (result === expected) {
      passed++;
      console.log(`✓ normalizeLineId("${input}") = "${result}"`);
    } else {
      failed++;
      console.error(
        `✗ normalizeLineId("${input}") = "${result}" (expected: "${expected}")`
      );
    }
  }

  return { passed, failed };
}
