'use client';

import { useState, useEffect } from 'react';
import { ONBOARDING_STORAGE_KEY } from '../constants';

export function useOnboarding() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(true); // 기본값 true로 SSR에서 깜빡임 방지
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window === 'undefined') return;

    const seen = localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
    setHasSeenOnboarding(seen);

    // 온보딩을 보지 않았으면 모달 열기
    if (!seen) {
      setIsOpen(true);
    }
  }, []);

  const markAsCompleted = () => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    setHasSeenOnboarding(true);
    setIsOpen(false);
  };

  const resetOnboarding = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasSeenOnboarding(false);
  };

  const showOnboarding = () => {
    setIsOpen(true);
  };

  return {
    hasSeenOnboarding,
    isOpen,
    markAsCompleted,
    resetOnboarding,
    showOnboarding,
    closeOnboarding: () => setIsOpen(false),
  };
}
