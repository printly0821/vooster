'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IntroSlide } from './slides/IntroSlide';
import { PermissionSlide } from './slides/PermissionSlide';
import { ScanTipsSlide } from './slides/ScanTipsSlide';
import { HistorySlide } from './slides/HistorySlide';
import { TOTAL_STEPS } from '../constants';
import { cn } from '@/lib/utils';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const slides = [IntroSlide, PermissionSlide, ScanTipsSlide, HistorySlide];

export function OnboardingModal({
  open,
  onComplete,
  onClose,
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const isFirstStep = currentStep === 0;

  // 슬라이드 변경 시 스크롤 초기화
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    onComplete();
  };

  // 키보드 네비게이션
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !isLastStep) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handlePrev();
      } else if (e.key === 'Enter' && isLastStep) {
        onComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentStep, isLastStep, isFirstStep]);

  const CurrentSlideComponent = slides[currentStep];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden"
        aria-describedby="onboarding-description"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>온보딩 튜토리얼</DialogTitle>
        </DialogHeader>
        <div id="onboarding-description" className="sr-only">
          바코드 주문 조회 앱 사용 방법을 안내합니다. {currentStep + 1}/{TOTAL_STEPS} 단계
        </div>

        {/* 슬라이드 컨텐츠 */}
        <div className="min-h-[400px] md:min-h-[500px]">
          <CurrentSlideComponent />
        </div>

        {/* 페이지 인디케이터 */}
        <div
          className="flex justify-center gap-2 px-6 py-4"
          role="tablist"
          aria-label="온보딩 진행 상황"
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={currentStep === index}
              aria-label={`${index + 1}번째 단계${currentStep === index ? ' (현재)' : ''}`}
              onClick={() => setCurrentStep(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-200',
                currentStep === index
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted hover:bg-muted-foreground/50',
              )}
            />
          ))}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                aria-label="이전 단계"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                이전
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {!isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                aria-label="온보딩 건너뛰기"
              >
                건너뛰기
              </Button>
            )}
            <Button
              variant={isLastStep ? 'default' : 'ghost'}
              size="sm"
              onClick={handleNext}
              aria-label={isLastStep ? '시작하기' : '다음 단계'}
            >
              {isLastStep ? '시작하기' : '다음'}
              {!isLastStep && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
