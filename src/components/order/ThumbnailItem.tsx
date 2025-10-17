/**
 * ThumbnailItem Component
 *
 * 개별 썸네일 아이템 컴포넌트
 * - 레이지 로딩 지원 (IntersectionObserver)
 * - 1:1 비율 유지
 * - 오류 폴백 처리
 * - 키보드 접근성 (Enter/Space)
 * - 로딩 스켈레톤
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ThumbnailItemProps {
  /** 이미지 URL */
  src: string;
  /** 이미지 alt 텍스트 (주문명 + 인덱스) */
  alt: string;
  /** 썸네일 인덱스 */
  index: number;
  /** 클릭 시 콜백 (이미지 뷰어 열기) */
  onOpen?: (index: number) => void;
  /** 우선 로드 여부 (상단 일부만 true) */
  priority?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

export function ThumbnailItem({
  src,
  alt,
  index,
  onOpen,
  priority = false,
  className,
}: ThumbnailItemProps) {
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: '50px',
  });

  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const handleClick = () => {
    onOpen?.(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter 또는 Space 키로 활성화
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-all',
        'hover:border-primary hover:shadow-md',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${alt} 보기`}
    >
      {/* 레이지 로딩: 뷰포트에 보이기 전까지는 스켈레톤 */}
      {!inView || (!priority && !isLoaded) ? (
        <Skeleton className="absolute inset-0" />
      ) : null}

      {/* 이미지가 뷰포트에 들어오면 로드 시작 */}
      {inView && !hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
          className={cn(
            'object-cover transition-all duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          priority={priority}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          quality={75}
        />
      ) : null}

      {/* 오류 폴백 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" aria-hidden="true" />
            <p className="text-xs">이미지 오류</p>
          </div>
        </div>
      )}

      {/* 호버 오버레이 */}
      <div
        className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10"
        aria-hidden="true"
      />
    </div>
  );
}

ThumbnailItem.displayName = 'ThumbnailItem';
