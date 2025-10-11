/**
 * ThumbnailGrid Component
 *
 * 주문 상세 썸네일을 반응형 그리드로 표시
 * - 모바일/태블릿/데스크톱에서 최적 열수 자동 조정
 * - 레이지 로딩 지원
 * - 이미지 뷰어 콜백 제공
 * - 접근성 지원 (키보드 네비게이션)
 *
 * @example
 * ```tsx
 * <ThumbnailGrid
 *   images={order.images}
 *   orderName={order.name}
 *   onOpenViewer={(index) => console.log('Open image', index)}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { ThumbnailItem } from './ThumbnailItem';
import { cn } from '@/lib/utils';

export interface ThumbnailImage {
  /** 이미지 ID */
  id: string | number;
  /** 이미지 URL */
  url: string;
}

export interface ThumbnailGridProps {
  /** 썸네일 이미지 배열 */
  images: ThumbnailImage[];
  /** 주문명 (alt 텍스트에 사용) */
  orderName?: string;
  /** 이미지 클릭 시 뷰어 열기 콜백 */
  onOpenViewer?: (index: number) => void;
  /** 우선 로드할 이미지 개수 (상단 일부만) */
  priorityCount?: number;
  /** 추가 CSS 클래스 */
  className?: string;
}

export function ThumbnailGrid({
  images,
  orderName = '주문',
  onOpenViewer,
  priorityCount = 4,
  className,
}: ThumbnailGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-12">
        <p className="text-sm text-muted-foreground">
          주문 이미지가 없습니다
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* 그리드 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          주문 이미지 <span className="text-muted-foreground">({images.length}장)</span>
        </h2>
      </div>

      {/* 반응형 그리드
          - 모바일: 3열
          - 태블릿: 4-5열
          - 데스크톱: 5-6열
          auto-fit + minmax + clamp를 사용하여 브레이크포인트 없이 유연하게 대응
      */}
      <ul
        className="grid gap-3 md:gap-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(100px, 20vw, 200px), 1fr))',
        }}
        role="list"
        aria-label={`${orderName} 썸네일 목록`}
      >
        {images.map((image, index) => (
          <li key={image.id} role="listitem">
            <ThumbnailItem
              src={image.url}
              alt={`${orderName} 썸네일 ${index + 1}`}
              index={index}
              onOpen={onOpenViewer}
              priority={index < priorityCount}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

ThumbnailGrid.displayName = 'ThumbnailGrid';
