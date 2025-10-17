/**
 * ImageViewer 테스트 페이지
 *
 * 이미지 뷰어의 모든 기능을 테스트할 수 있는 페이지
 * - 좌우 스와이프
 * - 확대/축소 (핀치, 더블탭, 버튼)
 * - 키보드 네비게이션 (Left/Right/Escape)
 * - 접근성 (스크린리더)
 * - 다크모드
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Keyboard, Accessibility, Monitor, Smartphone } from 'lucide-react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThumbnailGrid, type ThumbnailImage } from '@/components/order';

// 테스트용 이미지 데이터 (Unsplash random images)
const TEST_IMAGES: ThumbnailImage[] = [
  // 다양한 해상도와 주제의 이미지
  { id: 1, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop' }, // 산
  { id: 2, url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop' }, // 자연
  { id: 3, url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=800&fit=crop' }, // 안개
  { id: 4, url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop' }, // 숲
  { id: 5, url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1200&h=800&fit=crop' }, // 호수
  { id: 6, url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&h=800&fit=crop' }, // 일몰
  { id: 7, url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&h=800&fit=crop' }, // 해변
  { id: 8, url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&h=800&fit=crop' }, // 바다
  { id: 9, url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&h=800&fit=crop' }, // 계곡
  { id: 10, url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=1200&h=800&fit=crop' }, // 눈
  { id: 11, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=1200&fit=crop' }, // 세로 이미지
  { id: 12, url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=1200&fit=crop' }, // 세로 이미지
  { id: 13, url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2000&h=1000&fit=crop' }, // 와이드 이미지
  { id: 14, url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=2000&h=1000&fit=crop' }, // 와이드 이미지
  { id: 15, url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1000&h=1000&fit=crop' }, // 정사각형
  { id: 16, url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1000&h=1000&fit=crop' }, // 정사각형
  { id: 17, url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&h=800&fit=crop' },
  { id: 18, url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&h=800&fit=crop' },
  { id: 19, url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&h=800&fit=crop' },
  { id: 20, url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=1200&h=800&fit=crop' },
];

export default function ImageViewerTestPage() {
  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-64px)] flex-col pb-6 md:min-h-[calc(100vh-72px)]">
        {/* 헤더 */}
        <div className="border-b border-border bg-background p-4">
          <div className="container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    뒤로가기
                  </Button>
                </Link>
                <div>
                  <h1 className="text-lg font-semibold">이미지 뷰어 테스트</h1>
                  <p className="text-sm text-muted-foreground">
                    썸네일을 클릭하여 모든 기능을 테스트하세요
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                T-002 완료
              </Badge>
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          <div className="container py-6">
            <div className="space-y-6">
              {/* 테스트 가이드 */}
              <Card>
                <CardHeader>
                  <CardTitle>테스트 체크리스트</CardTitle>
                  <CardDescription>
                    다음 기능들을 테스트하여 모든 항목이 정상 작동하는지 확인하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* 기본 기능 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Monitor className="h-4 w-4 text-primary" />
                        데스크톱 기능
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>✓ 썸네일 클릭 시 모달 열림</li>
                        <li>✓ 좌우 화살표 버튼으로 슬라이드</li>
                        <li>✓ 확대/축소 버튼 작동</li>
                        <li>✓ X 버튼으로 모달 닫기</li>
                        <li>✓ 백드롭 클릭 시 닫기</li>
                      </ul>
                    </div>

                    {/* 모바일 기능 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Smartphone className="h-4 w-4 text-primary" />
                        모바일 제스처
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>✓ 좌우 스와이프로 슬라이드</li>
                        <li>✓ 핀치 줌으로 확대/축소</li>
                        <li>✓ 더블탭으로 확대/축소</li>
                        <li>✓ 확대 후 드래그로 이동</li>
                        <li>✓ 페이지 스크롤 잠금</li>
                      </ul>
                    </div>

                    {/* 키보드 접근성 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Keyboard className="h-4 w-4 text-primary" />
                        키보드 네비게이션
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>✓ Left: 이전 슬라이드</li>
                        <li>✓ Right: 다음 슬라이드</li>
                        <li>✓ Escape: 모달 닫기</li>
                        <li>✓ Tab: 포커스 이동</li>
                        <li>✓ Enter/Space: 버튼 활성화</li>
                      </ul>
                    </div>

                    {/* 접근성 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Accessibility className="h-4 w-4 text-primary" />
                        접근성 & 기타
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>✓ 포커스 트랩 (모달 내부만)</li>
                        <li>✓ 현재 인덱스 표시 (N/M)</li>
                        <li>✓ ARIA 레이블 (스크린리더)</li>
                        <li>✓ 다크모드 지원</li>
                        <li>✓ 지연 로딩 (Lazy)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 썸네일 그리드 */}
              <ThumbnailGrid
                images={TEST_IMAGES}
                orderName="테스트 이미지"
                priorityCount={6}
              />

              {/* 추가 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle>구현 세부사항</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-muted-foreground">라이브러리</dt>
                      <dd className="mt-1 font-mono">Swiper.js 11.x</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">모달</dt>
                      <dd className="mt-1 font-mono">Radix UI Dialog</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">최대 확대 비율</dt>
                      <dd className="mt-1 font-mono">3x (300%)</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">이미지 개수</dt>
                      <dd className="mt-1 font-mono">{TEST_IMAGES.length}장</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">지연 로딩</dt>
                      <dd className="mt-1 font-mono">상위 6개만 즉시 로드</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">이미지 형식</dt>
                      <dd className="mt-1 font-mono">가로/세로/정사각형</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
