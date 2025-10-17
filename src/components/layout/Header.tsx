"use client";

import React from "react";
import { Camera, Search, Clock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

type ViewMode = "camera" | "search";

interface HeaderProps {
  onHelpClick?: () => void;
}

export function Header({ onHelpClick }: HeaderProps = {}) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("camera");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between md:h-[72px]">
        {/* 좌측: 로고 + 모드 토글 */}
        <div className="flex items-center gap-4">
          {/* 로고 */}
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-foreground">바코드 주문</div>
          </div>

          {/* 카메라/검색 모드 토글 */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 transition-colors",
                viewMode === "camera" && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode("camera")}
              aria-pressed={viewMode === "camera"}
            >
              <Camera className="h-4 w-4 mr-1.5" />
              카메라
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 transition-colors",
                viewMode === "search" && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode("search")}
              aria-pressed={viewMode === "search"}
            >
              <Search className="h-4 w-4 mr-1.5" />
              검색
            </Button>
          </div>
        </div>

        {/* 우측: 최근 내역, 도움말, 다크모드 토글 */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {/* 최근 내역 */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="최근 내역"
            >
              <Clock className="h-5 w-5" />
            </Button>

            {/* 도움말 */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="도움말"
              onClick={onHelpClick}
            >
              <HelpCircle className="h-5 w-5" />
            </Button>

            {/* 다크모드 토글 */}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
