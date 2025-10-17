'use client';

import { useState } from 'react';
import { HelpCircle, Search, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { FAQ_DATA, FAQ_CATEGORIES } from '../constants/faq-data';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowOnboarding?: () => void;
}

export function HelpModal({
  open,
  onOpenChange,
  onShowOnboarding,
}: HelpModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = FAQ_DATA.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const groupedFAQs = Object.entries(FAQ_CATEGORIES).map(([key, label]) => ({
    category: key as keyof typeof FAQ_CATEGORIES,
    label,
    items: filteredFAQs.filter((faq) => faq.category === key),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-5 w-5 text-primary" />
            도움말
          </DialogTitle>
          <DialogDescription>
            자주 묻는 질문과 사용 가이드를 확인하세요
          </DialogDescription>
        </DialogHeader>

        {/* 빠른 액션 */}
        <div className="flex gap-2 pb-4 border-b border-border">
          {onShowOnboarding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onShowOnboarding();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              온보딩 다시 보기
            </Button>
          )}
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="질문 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="FAQ 검색"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="검색어 지우기"
            >
              ✕
            </button>
          )}
        </div>

        {/* FAQ 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredFAQs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                검색 결과가 없습니다
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedFAQs.map(
                ({ category, label, items }) =>
                  items.length > 0 && (
                    <div key={category}>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        {label}
                      </h3>
                      <Accordion type="single" collapsible className="w-full">
                        {items.map((faq) => (
                          <AccordionItem key={faq.id} value={faq.id}>
                            <AccordionTrigger className="text-left text-sm hover:no-underline">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ),
              )}
            </div>
          )}
        </div>

        {/* 추가 도움말 */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground text-center">
            문제가 해결되지 않았나요?{' '}
            <button className="text-primary hover:underline">
              고객 지원 문의
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
