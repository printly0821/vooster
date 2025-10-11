"use client";

import React from "react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between md:h-[72px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-foreground">Logo</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2">
            {/* 네비게이션 아이콘들이 여기에 추가될 예정 */}
          </nav>
        </div>
      </div>
    </header>
  );
}
