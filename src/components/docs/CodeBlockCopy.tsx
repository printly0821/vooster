'use client';

import { useEffect } from 'react';

export default function CodeBlockCopy() {
  useEffect(() => {
    // 모든 코드 블록에 복사 버튼 추가 (순수 DOM 조작)
    const codeBlocks = document.querySelectorAll('pre:not([data-copy-added])');

    codeBlocks.forEach((pre) => {
      const code = pre.querySelector('code');
      if (!code) return;

      // 이미 처리됨 표시
      pre.setAttribute('data-copy-added', 'true');

      // pre를 relative로 만들기
      (pre as HTMLElement).style.position = 'relative';

      // 복사 버튼 생성
      const button = document.createElement('button');
      button.className =
        'absolute right-2 top-2 rounded-lg bg-gray-700 p-2 text-gray-300 transition-colors hover:bg-gray-600 hover:text-white';
      button.title = '코드 복사';
      button.setAttribute('aria-label', '코드 복사');

      // 복사 아이콘 SVG
      const copyIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      `;

      // 체크 아이콘 SVG
      const checkIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;

      button.innerHTML = copyIcon;

      // 클릭 이벤트
      button.addEventListener('click', async () => {
        const codeText = code.textContent || '';

        try {
          await navigator.clipboard.writeText(codeText);

          // 성공 표시
          button.innerHTML = checkIcon;
          button.classList.add('text-green-400');

          setTimeout(() => {
            button.innerHTML = copyIcon;
            button.classList.remove('text-green-400');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });

      pre.appendChild(button);
    });
  }, []);

  return null;
}
