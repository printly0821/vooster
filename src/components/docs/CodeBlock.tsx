'use client';

import { useEffect, useRef } from 'react';
import CopyButton from './CopyButton';

interface CodeBlockProps {
  html: string;
}

/**
 * HTML 마크다운 콘텐츠를 파싱하고 코드 블록에 복사 버튼을 추가합니다.
 * dangerouslySetInnerHTML로 생성된 HTML을 래핑하고,
 * 클라이언트에서 React 컴포넌트로 개선합니다.
 */
export default function CodeBlock({ html }: CodeBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // 모든 pre 태그 찾기
    const preElements = contentRef.current.querySelectorAll('pre');

    preElements.forEach((pre) => {
      // 이미 처리된 코드 블록 스킵
      if (pre.getAttribute('data-has-copy-button')) return;

      // pre 요소의 위치 설정
      if (pre.style.position !== 'relative') {
        pre.style.position = 'relative';
      }

      // 코드 텍스트 추출
      const codeElement = pre.querySelector('code');
      if (!codeElement) return;

      const codeText = codeElement.textContent || '';

      // 처리 표시
      pre.setAttribute('data-has-copy-button', 'true');

      // 복사 버튼 컨테이너 생성
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'code-block-copy-button-container';
      buttonContainer.setAttribute('data-copy-button', 'true');

      // React 포탈로 버튼을 추가하기 위해 데이터 속성에 저장
      pre.setAttribute('data-code-text', codeText);

      // pre 요소에 절대 위치 버튼 추가 (임시 버튼)
      const tempButton = document.createElement('button');
      tempButton.className =
        'absolute right-2 top-2 rounded-lg bg-gray-700 p-2 text-gray-300 transition-colors hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500';
      tempButton.title = '코드 복사';
      tempButton.setAttribute('aria-label', '코드 복사');

      const copyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      copyIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      copyIcon.setAttribute('width', '16');
      copyIcon.setAttribute('height', '16');
      copyIcon.setAttribute('viewBox', '0 0 24 24');
      copyIcon.setAttribute('fill', 'none');
      copyIcon.setAttribute('stroke', 'currentColor');
      copyIcon.setAttribute('stroke-width', '2');
      copyIcon.setAttribute('stroke-linecap', 'round');
      copyIcon.setAttribute('stroke-linejoin', 'round');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '14');
      rect.setAttribute('height', '14');
      rect.setAttribute('x', '8');
      rect.setAttribute('y', '8');
      rect.setAttribute('rx', '2');
      rect.setAttribute('ry', '2');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2');

      copyIcon.appendChild(rect);
      copyIcon.appendChild(path);
      tempButton.appendChild(copyIcon);

      let copyTimer: NodeJS.Timeout;

      tempButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeText);

          // 성공 상태 표시
          tempButton.innerHTML = '';
          const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          checkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          checkIcon.setAttribute('width', '16');
          checkIcon.setAttribute('height', '16');
          checkIcon.setAttribute('viewBox', '0 0 24 24');
          checkIcon.setAttribute('fill', 'none');
          checkIcon.setAttribute('stroke', 'currentColor');
          checkIcon.setAttribute('stroke-width', '2');
          checkIcon.setAttribute('stroke-linecap', 'round');
          checkIcon.setAttribute('stroke-linejoin', 'round');

          const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          polyline.setAttribute('points', '20 6 9 17 4 12');
          checkIcon.appendChild(polyline);

          tempButton.appendChild(checkIcon);
          tempButton.classList.add('bg-green-600', 'text-green-100');
          tempButton.classList.remove('bg-gray-700', 'text-gray-300');

          copyTimer = setTimeout(() => {
            tempButton.innerHTML = '';
            tempButton.appendChild(copyIcon.cloneNode(true));
            tempButton.classList.remove('bg-green-600', 'text-green-100');
            tempButton.classList.add('bg-gray-700', 'text-gray-300');
          }, 2000);
        } catch (error) {
          console.error('Failed to copy:', error);
        }
      });

      pre.appendChild(tempButton);
    });

    return () => {
      // cleanup
    };
  }, [html]);

  return (
    <div
      ref={contentRef}
      className="markdown-content prose prose-gray max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
