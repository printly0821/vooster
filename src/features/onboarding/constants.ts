export const ONBOARDING_STORAGE_KEY = 'onboarding-seen';

export const ONBOARDING_STEPS = [
  'intro',
  'permission',
  'scan-tips',
  'history',
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;
