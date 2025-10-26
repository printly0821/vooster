/**
 * Options 페이지 진입점
 *
 * Preact 애플리케이션을 DOM에 마운트합니다.
 */

import { render } from 'preact';
import { App } from './App';

/**
 * 애플리케이션 마운트
 *
 * DOM이 로드되면 #root 엘리먼트에 App 컴포넌트를 렌더링합니다.
 */
function main() {
  const root = document.getElementById('root');

  if (!root) {
    console.error('루트 엘리먼트를 찾을 수 없습니다.');
    return;
  }

  // Preact 렌더링
  render(<App />, root);

  console.log('✓ Vooster Display Options 페이지가 로드되었습니다.');
}

// DOM 로드 완료 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
