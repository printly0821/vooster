/**
 * ReportView Component
 *
 * 제작의뢰서 전용 화면 (전체 화면)
 * - 헤더: 뒤로 가기, 인쇄 버튼
 * - 핵심 정보 요약 카드
 * - 상세 정보 Accordion
 * - 이미지 썸네일 그리드 (ThumbnailGrid)
 * - 하단 CTA (다시 스캔하기)
 */

'use client';

import * as React from 'react';
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  JobOrderResultAPIResponse,
  toJobOrderData,
} from '@/features/orders/api/schemas';
import { ThumbnailGrid, type ThumbnailImage } from '@/components/order';

interface ReportViewProps {
  /** 바코드 (주문번호) */
  barcode: string;
  /** 스캔 화면으로 복귀 */
  onBackToScanner: () => void;
}

/**
 * Fetch job order report from API
 */
async function fetchJobOrderReport(
  barcode: string
): Promise<JobOrderResultAPIResponse> {
  const response = await fetch(
    `/api/orders/job-order-report?barcode=${encodeURIComponent(barcode)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.errorMessages?.[0] || '주문 데이터를 가져올 수 없습니다.'
    );
  }

  return response.json();
}

export function ReportView({ barcode, onBackToScanner }: ReportViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fetch job order report
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobOrderReport', barcode],
    queryFn: () => fetchJobOrderReport(barcode),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  /**
   * Print using html2canvas
   */
  const handlePrint = async () => {
    if (!printRef.current) return;

    setIsPrinting(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: false,
        allowTaint: true,
        logging: false,
      });

      const imageData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>제작의뢰서 - ${barcode}</title>
              <style>
                body { margin: 0; padding: 0; }
                img { width: 100%; height: auto; }
              </style>
            </head>
            <body>
              <img src="${imageData}" onload="window.print();window.close()" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('인쇄 오류:', error);
      alert('인쇄 중 오류가 발생했습니다.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-background flex flex-col">
        {/* 헤더 */}
        <ReportHeader onBackToScanner={onBackToScanner} onPrint={handlePrint} isPrinting={isPrinting} />

        {/* 로딩 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
            <p className="text-lg font-medium">제작의뢰서를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-background flex flex-col">
        {/* 헤더 */}
        <ReportHeader onBackToScanner={onBackToScanner} onPrint={handlePrint} isPrinting={isPrinting} />

        {/* 에러 */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="rounded-lg border-2 border-destructive bg-destructive/5 p-6 text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <p className="text-destructive text-lg font-semibold">
                {(error as Error).message}
              </p>
              <Button onClick={onBackToScanner} className="w-full">
                ← 다시 스캔하기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data
  if (!data?.result) {
    return (
      <div className="h-screen bg-background flex flex-col">
        {/* 헤더 */}
        <ReportHeader onBackToScanner={onBackToScanner} onPrint={handlePrint} isPrinting={isPrinting} />

        {/* No data */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="text-4xl">🔍</div>
            <p className="text-lg font-medium">주문 데이터를 찾을 수 없습니다</p>
            <Button onClick={onBackToScanner} className="w-full">
              ← 다시 스캔하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const jobOrderData = toJobOrderData(data.result);
  const { report, thumbnails } = jobOrderData;

  // ThumbnailGrid용 데이터 변환
  const thumbnailImages: ThumbnailImage[] = thumbnails.map((thumb) => ({
    id: `${thumb.iteM_NM}-${thumb.pagE_NO}`,
    url: thumb.thumbnaiL_URL || '',
  }));

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* 헤더 */}
      <ReportHeader onBackToScanner={onBackToScanner} onPrint={handlePrint} isPrinting={isPrinting} />

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[210mm] mx-auto px-4 md:px-0 py-4 space-y-4">
          {/* 핵심 정보 요약 카드 */}
          <div className="bg-card rounded-lg border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                📄 {report.cusT_ORD_CD || barcode}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">품목:</span>
                <span className="font-medium truncate">{report.iteM_NM || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">수량:</span>
                <span className="font-medium">{report.orD_QTY_UNIT_NM || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">거래처:</span>
                <span className="font-medium truncate">{report.cusT_NM || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">긴급:</span>
                <span className={`font-bold ${report.fasT_YN === 'Y' ? 'text-destructive' : ''}`}>
                  {report.fasT_YN === 'Y' ? '긴급' : '일반'}
                </span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <span className="text-muted-foreground">배송일:</span>
                <span className="font-medium">{report.dlvR_YMD || '-'}</span>
              </div>
            </div>
          </div>

          {/* 상세 정보 Accordion */}
          <Accordion type="multiple" defaultValue={[]} className="bg-card rounded-lg border shadow-sm">
            <AccordionItem value="details" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <span className="text-sm font-semibold">📋 상세 정보 보기</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {/* 상세 정보 섹션들 */}
                <ReportDetails report={report} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* 이미지 미리보기 */}
          {thumbnails.length > 0 && (
            <ThumbnailGrid
              images={thumbnailImages}
              orderName={report.iteM_NM || '주문 이미지'}
              priorityCount={6}
            />
          )}

          {/* 하단 CTA */}
          <Button
            onClick={onBackToScanner}
            variant="outline"
            className="w-full py-6 text-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            다시 스캔하기
          </Button>
        </div>
      </div>

      {/* 인쇄용 숨겨진 콘텐츠 */}
      <div className="hidden">
        <PrintContent ref={printRef} report={report} thumbnails={thumbnails} barcode={barcode} />
      </div>
    </div>
  );
}

/**
 * 헤더 컴포넌트
 */
function ReportHeader({
  onBackToScanner,
  onPrint,
  isPrinting,
}: {
  onBackToScanner: () => void;
  onPrint: () => void;
  isPrinting: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
      <button
        onClick={onBackToScanner}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">스캔</span>
      </button>

      <h1 className="text-lg font-bold">제작의뢰서</h1>

      <button
        onClick={onPrint}
        disabled={isPrinting}
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Printer className="w-5 h-5" />
        <span className="font-medium">{isPrinting ? '처리중...' : '인쇄'}</span>
      </button>
    </div>
  );
}

/**
 * 상세 정보 섹션들
 */
function ReportDetails({ report }: { report: any }) {
  return (
    <div className="space-y-3 pt-2">
      {/* 주문 기본 정보 */}
      <section className="border-2 border-border p-4 rounded-lg">
        <h2 className="text-base font-bold mb-3">주문 정보</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-semibold">주문번호:</span> {report.cusT_ORD_CD || '-'}
          </div>
          <div>
            <span className="font-semibold">주문일자:</span> {report.orD_YMD || '-'}
          </div>
          <div>
            <span className="font-semibold">거래처:</span> {report.cusT_NM || '-'}
          </div>
          <div>
            <span className="font-semibold">담당자:</span> {report.cusT_INCHG || '-'}
          </div>
          <div className="col-span-2">
            <span className="font-semibold">연락처:</span> {report.cusT_INCHG_TEL || '-'}
          </div>
        </div>
      </section>

      {/* 제품 정보 */}
      <section className="border-2 border-border p-4 rounded-lg">
        <h2 className="text-base font-bold mb-3">제품 정보</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-semibold">품목:</span> {report.iteM_NM || '-'}
          </div>
          <div>
            <span className="font-semibold">규격:</span> {report.sizE_NM || '-'}
          </div>
          <div className="col-span-2">
            <span className="font-semibold">제작물 제목:</span> {report.orD_TITL_DTL || '-'}
          </div>
          <div>
            <span className="font-semibold">수량:</span> {report.orD_QTY_UNIT_NM || '-'}
          </div>
          <div>
            <span className="font-semibold">긴급여부:</span>{' '}
            <span className={report.fasT_YN === 'Y' ? 'text-destructive font-bold' : ''}>
              {report.fasT_YN === 'Y' ? '긴급' : '일반'}
            </span>
          </div>
        </div>
      </section>

      {/* 배송 정보 */}
      <section className="border-2 border-border p-4 rounded-lg">
        <h2 className="text-base font-bold mb-3">배송 정보</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-semibold">배송유형:</span> {report.dlvR_TYP_NM || '-'}
          </div>
          <div>
            <span className="font-semibold">배송요청일:</span> {report.dlvR_YMD || '-'}
          </div>
          <div>
            <span className="font-semibold">수취인:</span> {report.dlvR_RCIPT_NM_EX || '-'}
          </div>
          <div>
            <span className="font-semibold">연락처:</span> {report.dlvR_RCIPT_TEL_1_EX || '-'}
          </div>
          <div className="col-span-2">
            <span className="font-semibold">주소:</span> {report.dlvR_RCIPT_ADDR_EX || '-'}
          </div>
          {report.dlvR_NOTE_EX && (
            <div className="col-span-2">
              <span className="font-semibold">배송 비고:</span> {report.dlvR_NOTE_EX}
            </div>
          )}
        </div>
      </section>

      {/* 포장 정보 */}
      <section className="border-2 border-border p-4 rounded-lg">
        <h2 className="text-base font-bold mb-3">포장 정보</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-semibold">포장유형:</span> {report.pacK_TYP_NM || '-'}
          </div>
          {report.pacK_NOTE && (
            <div className="col-span-2">
              <span className="font-semibold">포장 비고:</span> {report.pacK_NOTE}
            </div>
          )}
        </div>
      </section>

      {/* 작업 비고 */}
      {report.worK_NOTE && (
        <section className="border-2 border-border p-4 rounded-lg">
          <h2 className="text-base font-bold mb-3">작업 비고</h2>
          <p className="text-sm">{report.worK_NOTE}</p>
        </section>
      )}
    </div>
  );
}

/**
 * 인쇄용 콘텐츠
 */
const PrintContent = React.forwardRef<HTMLDivElement, { report: any; thumbnails: any[]; barcode: string }>(
  ({ report, thumbnails, barcode }, ref) => {
    return (
      <div ref={ref} className="bg-white p-6">
        <div className="border-b-2 border-black p-6">
          <h1 className="text-3xl font-bold text-center">제작 의뢰서</h1>
          <p className="text-center text-gray-600 mt-2">Job Order Report</p>
        </div>

        <div className="p-6">
          <ReportDetails report={report} />
        </div>

        <div className="p-6 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>본 제작의뢰서는 {new Date().toLocaleDateString('ko-KR')}에 출력되었습니다.</p>
        </div>
      </div>
    );
  }
);

PrintContent.displayName = 'PrintContent';
