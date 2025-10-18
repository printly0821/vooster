/**
 * Web Vitals 성능 지표 수집
 * LCP, FID, CLS 등 Core Web Vitals를 측정합니다.
 */

export interface WebVitalsMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: 'navigate' | 'reload' | 'back_forward' | 'back_forward_cache';
}

export function reportWebVitals(metric: WebVitalsMetric): void {
  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.info('Web Vitals:', {
      name: metric.name,
      value: `${metric.value.toFixed(2)}ms`,
      rating: metric.rating,
      id: metric.id,
    });
  }

  // 프로덕션에서는 분석 서버로 전송
  if (process.env.NODE_ENV === 'production') {
    const body = JSON.stringify(metric);

    // Vercel Analytics 또는 커스텀 엔드포인트로 전송
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/web-vitals', body);
    } else {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        body,
        keepalive: true,
      }).catch(() => {
        // 네트워크 오류는 무시
      });
    }
  }
}

/**
 * 네비게이션 타입 가져오기
 */
function getNavigationType(): 'navigate' | 'reload' | 'back_forward' | 'back_forward_cache' {
  const type = performance.navigation.type;
  const typeMap: Record<number, 'navigate' | 'reload' | 'back_forward' | 'back_forward_cache'> = {
    0: 'navigate',
    1: 'reload',
    2: 'back_forward',
    255: 'back_forward_cache',
  };
  return typeMap[type] || 'navigate';
}

/**
 * Largest Contentful Paint (LCP)
 * 페이지의 메인 콘텐츠가 로드되는 데 걸리는 시간
 * Good: <= 2.5s, Needs improvement: <= 4s, Poor: > 4s
 */
export function observeLCP(callback: (metric: WebVitalsMetric) => void): void {
  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntryWithDuration;

      if (lastEntry) {
        const renderTime = lastEntry.renderTime || 0;
        const loadTime = lastEntry.loadTime || 0;
        const value = Math.round(renderTime || loadTime);
        let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

        if (value <= 2500) rating = 'good';
        else if (value <= 4000) rating = 'needs-improvement';
        else rating = 'poor';

        callback({
          name: 'LCP',
          value,
          rating,
          delta: value,
          id: `lcp-${Date.now()}`,
          navigationType: getNavigationType(),
        });
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    console.error('Failed to observe LCP:', error);
  }
}

/**
 * First Input Delay (FID) / Interaction to Next Paint (INP)
 * 사용자의 첫 인터랙션에 대한 응답 시간
 * Good: <= 100ms, Needs improvement: <= 300ms, Poor: > 300ms
 */
export function observeFID(callback: (metric: WebVitalsMetric) => void): void {
  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();

      for (const entry of entries) {
        const fidEntry = entry as PerformanceEntryWithDuration;
        const value = Math.round(fidEntry.processingDuration || 0);
        let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

        if (value <= 100) rating = 'good';
        else if (value <= 300) rating = 'needs-improvement';
        else rating = 'poor';

        callback({
          name: 'FID',
          value,
          rating,
          delta: value,
          id: `fid-${Date.now()}`,
          navigationType: getNavigationType(),
        });
      }
    });

    observer.observe({ entryTypes: ['first-input', 'event'] });
  } catch (error) {
    console.error('Failed to observe FID:', error);
  }
}

/**
 * Cumulative Layout Shift (CLS)
 * 페이지가 로드되는 동안 발생하는 예상치 못한 레이아웃 변화
 * Good: <= 0.1, Needs improvement: <= 0.25, Poor: > 0.25
 */
export function observeCLS(callback: (metric: WebVitalsMetric) => void): void {
  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      let clsValue = 0;

      for (const entry of entries) {
        const layoutShift = entry as unknown as { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput) {
          const firstSessionEntry = entries[0];
          const secondSessionEntry = entries[entries.length - 1];

          if (
            firstSessionEntry === entry ||
            ((secondSessionEntry as unknown as { startTime?: number }).startTime || 0) -
              ((firstSessionEntry as unknown as { startTime?: number }).startTime || 0) <
              1000
          ) {
            clsValue += layoutShift.value || 0;
          }
        }
      }

      const value = Math.round(clsValue * 10000) / 10000;
      let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

      if (value <= 0.1) rating = 'good';
      else if (value <= 0.25) rating = 'needs-improvement';
      else rating = 'poor';

      callback({
        name: 'CLS',
        value,
        rating,
        delta: value,
        id: `cls-${Date.now()}`,
        navigationType: getNavigationType(),
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (error) {
    console.error('Failed to observe CLS:', error);
  }
}

interface PerformanceEntryWithDuration {
  duration?: number;
  renderTime?: number;
  loadTime?: number;
  processingDuration?: number;
  startTime?: number;
  name?: string;
  entryType?: string;
}
