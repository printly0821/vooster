/**
 * useInView Hook
 *
 * IntersectionObserver를 사용하여 요소가 뷰포트에 들어왔는지 감지합니다.
 * 레이지 로딩 이미지 구현에 사용됩니다.
 *
 * @example
 * ```tsx
 * const { ref, inView } = useInView({ threshold: 0.1 });
 *
 * return (
 *   <div ref={ref}>
 *     {inView ? <img src={src} /> : <Skeleton />}
 *   </div>
 * );
 * ```
 */

import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions extends IntersectionObserverInit {
  /**
   * 요소가 한 번 보이면 다시 감지하지 않음
   * @default true
   */
  triggerOnce?: boolean;
}

interface UseInViewReturn<T extends HTMLElement = HTMLDivElement> {
  /** 관찰할 요소에 연결할 ref */
  ref: React.RefObject<T>;
  /** 요소가 뷰포트에 보이는지 여부 */
  inView: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): UseInViewReturn<T> {
  const {
    threshold = 0,
    root = null,
    rootMargin = '50px', // 50px 전에 미리 로드 시작
    triggerOnce = true,
  } = options;

  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // IntersectionObserver 지원 확인
    if (!('IntersectionObserver' in window)) {
      // 지원하지 않으면 즉시 로드
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);

            // triggerOnce가 true면 한 번만 감지하고 관찰 중지
            if (triggerOnce && element) {
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            // triggerOnce가 false면 뷰포트를 벗어나면 다시 false로
            setInView(false);
          }
        });
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);

    // Cleanup
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, root, rootMargin, triggerOnce]);

  return { ref, inView };
}
