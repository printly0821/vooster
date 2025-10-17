"use client";

import React, { type ReactNode, useState } from "react";
import { Header } from "./Header";
import { OnboardingModal } from "@/features/onboarding";
import { HelpModal } from "@/features/help";
import { useOnboarding } from "@/features/onboarding";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const { isOpen, markAsCompleted, showOnboarding, closeOnboarding } =
    useOnboarding();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header onHelpClick={() => setIsHelpOpen(true)} />
      <main className="flex-1">{children}</main>

      {/* 온보딩 모달 */}
      <OnboardingModal
        open={isOpen}
        onComplete={markAsCompleted}
        onClose={closeOnboarding}
      />

      {/* 도움말 모달 */}
      <HelpModal
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        onShowOnboarding={showOnboarding}
      />
    </div>
  );
}
