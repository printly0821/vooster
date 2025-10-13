/**
 * Job Order Report Page
 *
 * 제작의뢰서 페이지 - 바코드를 통해 주문 정보와 썸네일 이미지를 조회하고 표시합니다.
 *
 * @module app/orders/job-order-report/[barcode]/page
 */

'use client';

import { use, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import {
  JobOrderResultAPIResponse,
  toJobOrderData,
} from '@/features/orders/api/schemas';
import { ImageViewer } from '@/features/orders/components/ImageViewer';

interface PageProps {
  params: Promise<{ barcode: string }>;
}

/**
 * Fetch job order report from API
 */
async function fetchJobOrderReport(barcode: string): Promise<JobOrderResultAPIResponse> {
  const response = await fetch(`/api/orders/job-order-report?barcode=${encodeURIComponent(barcode)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errorMessages?.[0] || '주문 데이터를 가져올 수 없습니다.');
  }

  return response.json();
}

export default function JobOrderReportPage({ params }: PageProps) {
  const { barcode } = use(params);
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
        useCORS: false, // CORS 이슈 방지
        allowTaint: true, // 외부 이미지 허용
        logging: false,
      });

      // Open print dialog with canvas image
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">제작의뢰서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{(error as Error).message}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // No data
  if (!data?.result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">주문 데이터를 찾을 수 없습니다.</p>
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
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Action Bar */}
      <div className="max-w-[210mm] mx-auto mb-4 flex justify-end print:hidden">
        <Button
          onClick={handlePrint}
          disabled={isPrinting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isPrinting ? '처리 중...' : '인쇄하기'}
        </Button>
      </div>

      {/* Printable Content */}
      <div
        ref={printRef}
        className="max-w-[210mm] mx-auto bg-white shadow-lg"
        style={{ aspectRatio: '210 / 297' }}
      >
        {/* Header */}
        <div className="border-b-2 border-gray-800 p-6">
          <h1 className="text-3xl font-bold text-center">제작 의뢰서</h1>
          <p className="text-center text-gray-600 mt-2">Job Order Report</p>
        </div>

        {/* Order Information - 1단 구성 */}
        <div className="p-6 space-y-6">
          {/* 주문 기본 정보 */}
          <section className="border-2 border-gray-300 p-4">
            <h2 className="text-lg font-bold mb-3 bg-gray-100 px-2 py-1">주문 정보</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
          <section className="border-2 border-gray-300 p-4">
            <h2 className="text-lg font-bold mb-3 bg-gray-100 px-2 py-1">제품 정보</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
                <span className={report.fasT_YN === 'Y' ? 'text-red-600 font-bold' : ''}>
                  {report.fasT_YN === 'Y' ? '긴급' : '일반'}
                </span>
              </div>
            </div>
          </section>

          {/* 배송 정보 */}
          <section className="border-2 border-gray-300 p-4">
            <h2 className="text-lg font-bold mb-3 bg-gray-100 px-2 py-1">배송 정보</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
          <section className="border-2 border-gray-300 p-4">
            <h2 className="text-lg font-bold mb-3 bg-gray-100 px-2 py-1">포장 정보</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
            <section className="border-2 border-gray-300 p-4">
              <h2 className="text-lg font-bold mb-3 bg-gray-100 px-2 py-1">작업 비고</h2>
              <p className="text-sm">{report.worK_NOTE}</p>
            </section>
          )}
        </div>

        {/* Thumbnail Images Section */}
        {thumbnails.length > 0 && (
          <div className="p-6 border-t-2 border-gray-300">
            <h2 className="text-lg font-bold mb-4 bg-gray-100 px-2 py-1">이미지 미리보기</h2>

            {/* 품목별로 그룹화된 썸네일 표시 */}
            {Object.entries(groupedThumbnails).map(([itemName, thumbs]) => (
              <div key={itemName} className="mb-6">
                <h3 className="font-semibold text-md mb-2 text-gray-700">
                  {itemName} ({thumbs.length}페이지)
                </h3>

                <div className="grid grid-cols-4 gap-2">
                  {thumbs.map((thumb, index) => (
                    <div key={thumb.thumbnaiL_URL || index} className="border border-gray-300 p-1">
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
                          <p className="text-xs text-center mt-1 text-gray-600">
                            P.{thumb.pagE_NO}
                          </p>
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500">이미지 없음</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>본 제작의뢰서는 {new Date().toLocaleDateString('ko-KR')}에 출력되었습니다.</p>
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
