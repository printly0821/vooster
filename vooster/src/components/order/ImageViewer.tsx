/**
 * ImageViewer Component
 *
 * 전체 화면 이미지 뷰어 모달
 * - Swiper 기반 슬라이드 (좌우 스와이프)
 * - 확대/축소 (핀치, 더블탭, 버튼)
 * - 키보드 접근성 (Left/Right/Escape/Enter/Space)
 * - 포커스 트랩, 스크롤 잠금 (Radix Dialog)
 * - 지연 로딩, 썸네일 네비게이터
 */

'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Keyboard, A11y, Zoom } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Swiper 스타일
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/zoom';

import { cn } from '@/lib/utils';

export interface ImageViewerProps {
  /** 이미지 URL 배열 */
  images: string[];
  /** 초기 슬라이드 인덱스 */
  initialIndex?: number;
  /** 모달 열림 상태 */
  open: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 이미지 alt 텍스트 prefix */
  altPrefix?: string;
}

export function ImageViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
  altPrefix = '주문 이미지',
}: ImageViewerProps) {
  const [swiper, setSwiper] = React.useState<SwiperType | null>(null);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [isZoomed, setIsZoomed] = React.useState(false);

  // 초기 인덱스가 변경되면 슬라이드 이동
  React.useEffect(() => {
    if (swiper && open) {
      swiper.slideTo(initialIndex, 0); // 즉시 이동
      setCurrentIndex(initialIndex);
    }
  }, [swiper, initialIndex, open]);

  // 모달이 열릴 때마다 초기화
  React.useEffect(() => {
    if (open) {
      setIsZoomed(false);
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const handleZoomToggle = () => {
    if (!swiper?.zoom) return;

    if (isZoomed) {
      swiper.zoom.out();
      setIsZoomed(false);
    } else {
      swiper.zoom.in();
      setIsZoomed(true);
    }
  };

  const handlePrev = () => {
    swiper?.slidePrev();
  };

  const handleNext = () => {
    swiper?.slideNext();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col focus:outline-none"
          aria-describedby={undefined}
        >
          {/* 헤더 (닫기 버튼, 인덱스 표시, 확대/축소 버튼) */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Dialog.Title className="text-sm font-medium text-white">
                {currentIndex + 1} / {images.length}
              </Dialog.Title>
              <span className="sr-only">
                {images.length}개 중 {currentIndex + 1}번째 이미지
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 확대/축소 버튼 */}
              <button
                type="button"
                onClick={handleZoomToggle}
                className={cn(
                  'rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-white/50'
                )}
                aria-label={isZoomed ? '축소' : '확대'}
              >
                {isZoomed ? (
                  <ZoomOut className="h-5 w-5" />
                ) : (
                  <ZoomIn className="h-5 w-5" />
                )}
              </button>

              {/* 닫기 버튼 */}
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={cn(
                    'rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-white/50'
                  )}
                  aria-label="닫기"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Swiper 슬라이더 */}
          <div className="relative flex-1">
            <Swiper
              modules={[Pagination, Keyboard, A11y, Zoom]}
              spaceBetween={0}
              slidesPerView={1}
              initialSlide={initialIndex}
              zoom={{
                maxRatio: 3,
                minRatio: 1,
                toggle: true,
              }}
              navigation={false}
              pagination={{
                clickable: true,
                dynamicBullets: true,
                dynamicMainBullets: 5,
              }}
              keyboard={{
                enabled: true,
                onlyInViewport: false,
              }}
              a11y={{
                enabled: true,
                prevSlideMessage: '이전 이미지',
                nextSlideMessage: '다음 이미지',
                firstSlideMessage: '첫 번째 이미지',
                lastSlideMessage: '마지막 이미지',
                paginationBulletMessage: '{{index}}번째 이미지로 이동',
              }}
              onSwiper={setSwiper}
              onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
              onZoomChange={(swiper, scale) => setIsZoomed(scale > 1)}
              className="h-full w-full"
              style={
                {
                  '--swiper-pagination-color': '#fff',
                  '--swiper-pagination-bullet-inactive-color': '#fff',
                  '--swiper-pagination-bullet-inactive-opacity': '0.3',
                } as React.CSSProperties
              }
            >
              {images.map((src, index) => (
                <SwiperSlide key={`${src}-${index}`}>
                  <div className="swiper-zoom-container flex h-full w-full items-center justify-center">
                    <img
                      src={src}
                      alt={`${altPrefix} ${index + 1}`}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* 커스텀 네비게이션 버튼 */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-30"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-30"
                  onClick={handleNext}
                  disabled={currentIndex === images.length - 1}
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* 하단 썸네일 네비게이터 (선택사항, 추후 추가 가능) */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

ImageViewer.displayName = 'ImageViewer';
