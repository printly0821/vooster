'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import {
  FileText,
  Code,
  Palette,
  BookOpen,
  Lock,
  FileCode,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const DOCS_NAV = [
  {
    category: '가이드',
    icon: BookOpen,
    items: [
      {
        slug: 'barcode-guide',
        title: '웹 바코드 스캐닝 가이드',
        icon: FileCode,
        public: true,
      },
    ],
  },
  {
    category: '프로젝트 기획',
    icon: FileText,
    items: [
      {
        slug: 'prd',
        title: 'PRD',
        icon: FileText,
        public: false,
      },
      {
        slug: 'field-analysis',
        title: '현장 요구사항 분석',
        icon: FileText,
        public: false,
      },
    ],
  },
  {
    category: '기술 설계',
    icon: Code,
    items: [
      {
        slug: 'architecture',
        title: 'TRD',
        icon: Code,
        public: false,
      },
      {
        slug: 'guideline',
        title: '코드 가이드라인',
        icon: Code,
        public: false,
      },
      {
        slug: 'step-by-step',
        title: 'Step by Step',
        icon: Code,
        public: false,
      },
      {
        slug: 'clean-code',
        title: 'Clean Code',
        icon: Code,
        public: false,
      },
    ],
  },
  {
    category: '디자인 설계',
    icon: Palette,
    items: [
      {
        slug: 'design-guide',
        title: 'Design Guide',
        icon: Palette,
        public: false,
      },
      {
        slug: 'ia',
        title: 'IA',
        icon: Palette,
        public: false,
      },
    ],
  },
  {
    // 원격 제어 시스템 관련 문서 섹션
    category: '원격 제어 시스템',
    icon: Zap,
    items: [
      // 개요 및 시작
      {
        slug: 'remote-control/index',
        title: 'TypeScript 설계 INDEX',
        icon: FileCode,
        public: false,
      },
      {
        slug: 'remote-control/summary',
        title: '빠른 요약 (5분)',
        icon: FileCode,
        public: false,
      },
      {
        slug: 'remote-control/readme',
        title: '프로젝트 README',
        icon: BookOpen,
        public: false,
      },
      {
        slug: 'remote-control/fullstack-summary',
        title: '풀스택 전략 요약',
        icon: Code,
        public: false,
      },
      // 기술 설계
      {
        slug: 'remote-control/rpc-comparison',
        title: 'RPC 솔루션 비교분석',
        icon: Code,
        public: false,
      },
      {
        slug: 'remote-control/architecture',
        title: 'TypeScript 아키텍처',
        icon: Code,
        public: false,
      },
      {
        slug: 'remote-control/implementation',
        title: 'TypeScript 구현 가이드',
        icon: Code,
        public: false,
      },
      {
        slug: 'remote-control/distributed-architecture',
        title: '분산 제어 아키텍처',
        icon: Code,
        public: false,
      },
      {
        slug: 'remote-control/distributed-implementation',
        title: '분산 제어 구현 가이드',
        icon: Code,
        public: false,
      },
      {
        slug: 'remote-control/distributed-quick-start',
        title: '빠른 시작 가이드',
        icon: Code,
        public: false,
      },
      {
        slug: 'remote-control/frontend-websocket',
        title: '프론트엔드 WebSocket',
        icon: Code,
        public: false,
      },
      // 풀스택 및 배포
      {
        slug: 'remote-control/fullstack-design',
        title: '풀스택 설계',
        icon: Code,
        public: false,
      },
      {
        slug: 'remote-control/fullstack-implementation',
        title: '풀스택 구현 가이드',
        icon: FileCode,
        public: false,
      },
      {
        slug: 'remote-control/deployment',
        title: '배포 및 운영 가이드',
        icon: Code,
        public: false,
      },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useCurrentUser();

  const handleDocClick = (
    item: { slug: string; public: boolean },
    e: React.MouseEvent,
  ) => {
    // 비공개 문서이고 미인증 상태일 때
    if (!item.public && !isAuthenticated) {
      e.preventDefault();
      router.push(`/login?redirectedFrom=/docs/${item.slug}`);
      onClose(); // 모바일에서 사이드바 닫기
      return;
    }

    // 공개 문서이거나 인증된 경우: 기본 Link 동작
    onClose();
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 z-50 h-screen w-[280px] border-r border-gray-200 bg-white transition-transform duration-300 dark:border-gray-800 dark:bg-gray-950 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <FileCode className="h-6 w-6" />
            <div>
              <h2 className="font-semibold">프로젝트 기획</h2>
              <p className="text-xs text-gray-500">Documentation</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-6">
              {DOCS_NAV.map((section) => (
                <div key={section.category}>
                  <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <section.icon className="h-4 w-4" />
                    {section.category}
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === `/docs/${item.slug}`;
                      const ItemIcon = item.icon;
                      const isLocked = !item.public && !isAuthenticated;

                      return (
                        <li key={item.slug}>
                          <Link
                            href={`/docs/${item.slug}`}
                            onClick={(e) => handleDocClick(item, e)}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100',
                              isLocked && 'cursor-pointer', // 클릭 가능 표시
                            )}
                          >
                            <ItemIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            {!item.public && (
                              <Lock
                                className={cn(
                                  'h-3 w-3',
                                  isLocked
                                    ? 'text-amber-500'
                                    : 'text-gray-400',
                                )}
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
