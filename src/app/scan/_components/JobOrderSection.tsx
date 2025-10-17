'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
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
import { ImageViewer } from '@/features/orders/components/ImageViewer';
import { ChevronUp } from 'lucide-react';

interface JobOrderSectionProps {
  barcode: string;
  onOpenScanner: () => void;
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

export function JobOrderSection({
  barcode,
  onOpenScanner,
}: JobOrderSectionProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Image Viewer state
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

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
      <div className="bg-background py-8 px-4 md:px-8 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full space-y-6 text-center">
          {/* 스켈레톤 로딩 UI */}
          <div className="bg-card rounded-card p-6 space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
          <div>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
            <p className="mt-4 text-lg text-foreground font-medium">제작의뢰서를 불러오는 중...</p>
            <p className="mt-2 text-sm text-muted-foreground">잠시만 기다려주세요</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-background py-12 px-4 md:px-8 min-h-[400px] flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="rounded-card border-2 border-destructive bg-destructive/5 p-6 md:p-8 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-destructive text-lg font-semibold">
              {(error as Error).message}
            </p>
            <div className="flex gap-2 justify-center pt-4">
              <Button
                onClick={() => window.location.reload()}
                className="bg-destructive hover:bg-destructive/90"
              >
                다시 시도
              </Button>
              <Button onClick={onOpenScanner} variant="outline">
                다른 바코드 스캔
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
      <div className="bg-background py-12 px-4 md:px-8 min-h-[400px] flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-4xl">🔍</div>
          <p className="text-lg text-foreground font-medium">
            주문 데이터를 찾을 수 없습니다
          </p>
          <Button onClick={onOpenScanner} className="w-full">
            다시 스캔하기
          </Button>
        </div>
      </div>
    );
  }

  const jobOrderData = toJobOrderData(data.result);
  const { report, thumbnails, groupedThumbnails } = jobOrderData;

  // 이미지 뷰어용 데이터 변환
  const viewerImages = thumbnails.map((thumb) => ({
    url: thumb.thumbnaiL_URL || '',
    title: `${thumb.iteM_NM || '이미지'}`,
    pageNo: thumb.pagE_NO,
  }));

  // 이미지 클릭 핸들러
  const handleImageClick = (thumbnailUrl: string) => {
    const index = thumbnails.findIndex((t) => t.thumbnaiL_URL === thumbnailUrl);
    if (index !== -1) {
      setViewerImageIndex(index);
      setIsViewerOpen(true);
    }
  };

  return (
    <div className="bg-background py-4 md:py-8">
      {/* 핵심 정보 요약 섹션 */}
      <div className="max-w-[210mm] mx-auto px-4 md:px-0 mb-4">
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              📄 {report.cusT_ORD_CD || barcode}
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={onOpenScanner}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <ChevronUp className="w-3 h-3" />
                스캔
              </Button>
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                {isPrinting ? '처리중...' : '인쇄'}
              </Button>
            </div>
          </div>

          {/* 핵심 정보 그리드 */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">품목:</span>
              <span className="font-medium text-foreground truncate">{report.iteM_NM || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">수량:</span>
              <span className="font-medium text-foreground">{report.orD_QTY_UNIT_NM || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">거래처:</span>
              <span className="font-medium text-foreground truncate">{report.cusT_NM || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">긴급:</span>
              <span className={`font-bold ${report.fasT_YN === 'Y' ? 'text-destructive' : 'text-foreground'}`}>
                {report.fasT_YN === 'Y' ? '긴급' : '일반'}
              </span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <span className="text-muted-foreground">배송일:</span>
              <span className="font-medium text-foreground">{report.dlvR_YMD || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar (기존 위치 제거됨) */}

      {/* 상세 정보 Accordion */}
      <div className="max-w-[210mm] mx-auto px-4 md:px-0 mb-4">
        <Accordion type="multiple" defaultValue={[]} className="bg-card rounded-lg border shadow-sm">
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="text-sm font-semibold">📋 상세 정보 보기</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3 pt-2">
            {/* 주문 기본 정보 */}
            <section className="border-2 border-border p-4">
              <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                주문 정보
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <span className="font-semibold">주문번호:</span>{' '}
                  <span>{report.cusT_ORD_CD || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">주문일자:</span>{' '}
                  <span>{report.orD_YMD || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">거래처:</span>{' '}
                  <span>{report.cusT_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">담당자:</span>{' '}
                  <span>{report.cusT_INCHG || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">연락처:</span>{' '}
                  <span>{report.cusT_INCHG_TEL || '-'}</span>
                </div>
              </div>
            </section>

            {/* 제품 정보 */}
            <section className="border-2 border-border p-4">
              <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                제품 정보
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <span className="font-semibold">품목:</span>{' '}
                  <span>{report.iteM_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">규격:</span>{' '}
                  <span>{report.sizE_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">제작물 제목:</span>{' '}
                  <span>{report.orD_TITL_DTL || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">수량:</span>{' '}
                  <span>{report.orD_QTY_UNIT_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">긴급여부:</span>{' '}
                  <span
                    className={
                      report.fasT_YN === 'Y' ? 'text-destructive font-bold' : ''
                    }
                  >
                    {report.fasT_YN === 'Y' ? '긴급' : '일반'}
                  </span>
                </div>
              </div>
            </section>

            {/* 배송 정보 */}
            <section className="border-2 border-border p-4">
              <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                배송 정보
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <span className="font-semibold">배송유형:</span>{' '}
                  <span>{report.dlvR_TYP_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">배송요청일:</span>{' '}
                  <span>{report.dlvR_YMD || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">수취인:</span>{' '}
                  <span>{report.dlvR_RCIPT_NM_EX || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">연락처:</span>{' '}
                  <span>{report.dlvR_RCIPT_TEL_1_EX || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">주소:</span>{' '}
                  <span>{report.dlvR_RCIPT_ADDR_EX || '-'}</span>
                </div>
                {report.dlvR_NOTE_EX && (
                  <div className="col-span-2">
                    <span className="font-semibold">배송 비고:</span>{' '}
                    <span>{report.dlvR_NOTE_EX}</span>
                  </div>
                )}
              </div>
            </section>

            {/* 포장 정보 */}
            <section className="border-2 border-border p-4">
              <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                포장 정보
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <span className="font-semibold">포장유형:</span>{' '}
                  <span>{report.pacK_TYP_NM || '-'}</span>
                </div>
                {report.pacK_NOTE && (
                  <div className="col-span-2">
                    <span className="font-semibold">포장 비고:</span>{' '}
                    <span>{report.pacK_NOTE}</span>
                  </div>
                )}
              </div>
            </section>

            {/* 작업 비고 */}
            {report.worK_NOTE && (
              <section className="border-2 border-border p-4">
                <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                  작업 비고
                </h2>
                <p className="text-sm text-foreground">{report.worK_NOTE}</p>
              </section>
            )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* 이미지 미리보기 섹션 (항상 표시) */}
      {thumbnails.length > 0 && (
        <div className="max-w-[210mm] mx-auto px-4 md:px-0 mb-4">
          <div className="bg-card rounded-lg border shadow-sm p-4">
            <h2 className="text-sm font-semibold mb-3 text-foreground">🖼 이미지 미리보기</h2>

            {Object.entries(groupedThumbnails).map(([itemName, thumbs]) => (
              <div key={itemName} className="mb-4 last:mb-0">
                <h3 className="text-xs font-medium mb-2 text-muted-foreground">
                  {itemName} ({thumbs.length}페이지)
                </h3>

                <div className="grid grid-cols-4 gap-2">
                  {thumbs.map((thumb, index) => (
                    <div
                      key={thumb.thumbnaiL_URL || index}
                      className="border border-border rounded overflow-hidden"
                    >
                      {thumb.thumbnaiL_URL ? (
                        <div
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleImageClick(thumb.thumbnaiL_URL!)}
                        >
                          <img
                            src={thumb.thumbnaiL_URL}
                            alt={`${itemName} ${thumb.pagE_NO}페이지`}
                            className="w-full h-auto"
                            loading="lazy"
                          />
                          <p className="text-xs text-center py-1 bg-muted text-muted-foreground">
                            P.{thumb.pagE_NO}
                          </p>
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">이미지 없음</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 인쇄용 콘텐츠 (화면에서 숨김) */}
      <div className="hidden print:block">
        <div
          ref={printRef}
          className="bg-card shadow-card print:shadow-none"
          style={{ aspectRatio: '210 / 297' }}
        >
          {/* Header */}
          <div className="border-b-2 border-foreground p-6">
            <h1 className="text-3xl font-bold text-center text-foreground">제작 의뢰서</h1>
            <p className="text-center text-muted-foreground mt-2">Job Order Report</p>
          </div>

          {/* Order Information - 인쇄용 전체 정보 */}
          <div className="p-6 space-y-6">
            {/* 주문 기본 정보 */}
            <section className="border-2 border-border p-4">
              <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                주문 정보
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <span className="font-semibold">주문번호:</span>{' '}
                  <span>{report.cusT_ORD_CD || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">주문일자:</span>{' '}
                  <span>{report.orD_YMD || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">거래처:</span>{' '}
                  <span>{report.cusT_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">담당자:</span>{' '}
                  <span>{report.cusT_INCHG || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">연락처:</span>{' '}
                  <span>{report.cusT_INCHG_TEL || '-'}</span>
                </div>
              </div>
            </section>

            {/* 제품 정보 */}
            <section className="border-2 border-border p-4">
              <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                제품 정보
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <span className="font-semibold">품목:</span>{' '}
                  <span>{report.iteM_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">규격:</span>{' '}
                  <span>{report.sizE_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">제작물 제목:</span>{' '}
                  <span>{report.orD_TITL_DTL || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">수량:</span>{' '}
                  <span>{report.orD_QTY_UNIT_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">긴급여부:</span>{' '}
                  <span
                    className={
                      report.fasT_YN === 'Y' ? 'text-destructive font-bold' : ''
                    }
                  >
                    {report.fasT_YN === 'Y' ? '긴급' : '일반'}
                  </span>
                </div>
              </div>
            </section>

            {/* 배송 정보 */}
            <section className="border-2 border-border p-4">
              <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                배송 정보
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <span className="font-semibold">배송유형:</span>{' '}
                  <span>{report.dlvR_TYP_NM || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">배송요청일:</span>{' '}
                  <span>{report.dlvR_YMD || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">수취인:</span>{' '}
                  <span>{report.dlvR_RCIPT_NM_EX || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">연락처:</span>{' '}
                  <span>{report.dlvR_RCIPT_TEL_1_EX || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">주소:</span>{' '}
                  <span>{report.dlvR_RCIPT_ADDR_EX || '-'}</span>
                </div>
                {report.dlvR_NOTE_EX && (
                  <div className="col-span-2">
                    <span className="font-semibold">배송 비고:</span>{' '}
                    <span>{report.dlvR_NOTE_EX}</span>
                  </div>
                )}
              </div>
            </section>

            {/* 포장 정보 */}
            <section className="border-2 border-border p-4">
              <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                포장 정보
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <span className="font-semibold">포장유형:</span>{' '}
                  <span>{report.pacK_TYP_NM || '-'}</span>
                </div>
                {report.pacK_NOTE && (
                  <div className="col-span-2">
                    <span className="font-semibold">포장 비고:</span>{' '}
                    <span>{report.pacK_NOTE}</span>
                  </div>
                )}
              </div>
            </section>

            {/* 작업 비고 */}
            {report.worK_NOTE && (
              <section className="border-2 border-border p-4">
                <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                  작업 비고
                </h2>
                <p className="text-sm text-foreground">{report.worK_NOTE}</p>
              </section>
            )}

            {/* 이미지 */}
            {thumbnails.length > 0 && (
              <section className="border-2 border-border p-4">
                <h2 className="text-lg font-bold mb-3 bg-muted px-2 py-1 text-foreground">
                  이미지 미리보기
                </h2>
                {Object.entries(groupedThumbnails).map(([itemName, thumbs]) => (
                  <div key={itemName} className="mb-4">
                    <h3 className="font-semibold text-md mb-2 text-foreground">
                      {itemName} ({thumbs.length}페이지)
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {thumbs.map((thumb, index) => (
                        <div
                          key={thumb.thumbnaiL_URL || index}
                          className="border border-border p-1"
                        >
                          {thumb.thumbnaiL_URL ? (
                            <div>
                              <img
                                src={thumb.thumbnaiL_URL}
                                alt={`${itemName} ${thumb.pagE_NO}페이지`}
                                className="w-full h-auto"
                              />
                              <p className="text-xs text-center mt-1 text-muted-foreground">
                                P.{thumb.pagE_NO}
                              </p>
                            </div>
                          ) : (
                            <div className="w-full aspect-square bg-muted flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">이미지 없음</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border text-center text-xs text-muted-foreground">
            <p>
              본 제작의뢰서는 {new Date().toLocaleDateString('ko-KR')}에
              출력되었습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      <ImageViewer
        images={viewerImages}
        initialIndex={viewerImageIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
}
