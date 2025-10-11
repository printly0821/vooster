/**
 * ThemeToggle Component
 *
 * 다크모드 토글 컴포넌트
 * - Light / Dark / System 3가지 테마 선택
 * - 드롭다운 메뉴 UI
 * - 키보드 접근성 (Tab, Enter, Escape, Arrow keys)
 * - localStorage 자동 저장 (next-themes)
 */

'use client';

import * as React from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  /** 버튼 크기 */
  size?: 'sm' | 'default' | 'lg' | 'icon';
  /** 추가 CSS 클래스 */
  className?: string;
}

const themes = [
  {
    value: 'light',
    label: '라이트 모드',
    icon: Sun,
    description: '밝은 테마',
  },
  {
    value: 'dark',
    label: '다크 모드',
    icon: Moon,
    description: '어두운 테마',
  },
  {
    value: 'system',
    label: '시스템 설정',
    icon: Monitor,
    description: '시스템 테마 자동 감지',
  },
] as const;

export function ThemeToggle({ size = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // 클라이언트 사이드에서만 렌더링 (Hydration 불일치 방지)
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 현재 테마 아이콘
  const currentThemeIcon = React.useMemo(() => {
    const currentTheme = themes.find((t) => t.value === theme);
    return currentTheme?.icon || Sun;
  }, [theme]);

  const CurrentIcon = currentThemeIcon;

  // SSR 시 플레이스홀더 렌더링
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={size}
        className={cn('rounded-full', className)}
        disabled
        aria-label="테마 선택"
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={cn('rounded-full', className)}
          aria-label="테마 선택"
        >
          <CurrentIcon className="h-5 w-5" />
          <span className="sr-only">테마 메뉴 열기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {themes.map(({ value, label, icon: Icon, description }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </div>
            </div>
            {theme === value && (
              <Check className="h-4 w-4 text-primary" aria-label="선택됨" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

ThemeToggle.displayName = 'ThemeToggle';
