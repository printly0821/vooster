export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export type OnboardingStep = 'intro' | 'permission' | 'scan-tips' | 'history';

export interface OnboardingState {
  isOpen: boolean;
  currentStep: number;
  hasSeenOnboarding: boolean;
}
