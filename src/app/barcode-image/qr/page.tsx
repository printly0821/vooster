'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { MainLayout } from '@/components/layout';
import {
  PrintHeader,
  PrintInstructions,
  ScanInstructions,
  PrintStyles,
} from '../_components';

/**
 * QR 코드 그리드 인쇄 페이지
 *
 * 주문번호들을 QR 코드 형태로 그리드 배치하여
 * 인쇄하기 쉽도록 구성된 페이지입니다.
 */
export default function QRCodePage() {
  // 바코드 생성 할 주문번호들
  const orderNumbers = [
    '202510-BIZ-04464_38',
    '202510-FUJ-00013_00',
    '202510-FUJ-00016_00',
    '202510-FUJ-00016_01',
    '202510-FUJ-00015_00',
    '202510-FUJ-00015_01',
    '202510-FUJ-00015_02',
    '202510-FUJ-00015_03',
    '202510-FUJ-00015_05',
    '202510-FUJ-00014_00',
    '202510-FUJ-00013_01',
    '202510-FUJ-00010_00',
    '202510-FUJ-00009_00',
  ];

  return (
    <MainLayout>
      <div
        style={{
          padding: '20px',
          minHeight: '100vh',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* 헤더 */}
          <PrintHeader
            title="📦 주문번호 QR 코드 인쇄"
            subtitle={`${orderNumbers.length}개 주문 | QR 코드`}
          />

          {/* QR 코드 그리드 */}
          <div
            className="print-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '40px',
            }}
          >
            {orderNumbers.map((orderNumber, index) => (
              <QRCodeItem
                key={orderNumber}
                orderNumber={orderNumber}
                index={index}
              />
            ))}
          </div>

          {/* 인쇄 안내 */}
          <PrintInstructions />

          {/* 스캔 안내 */}
          <ScanInstructions />
        </div>
      </div>

      {/* 인쇄 스타일 */}
      <PrintStyles />
    </MainLayout>
  );
}

/**
 * QR 코드 아이템 컴포넌트
 *
 * qrcode 라이브러리를 사용하여 클라이언트에서 QR 코드 생성
 */
function QRCodeItem({
  orderNumber,
  index,
}: {
  orderNumber: string;
  index: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        orderNumber,
        {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) {
            console.error('QR 코드 생성 실패:', error);
          }
        }
      );
    }
  }, [orderNumber]);

  return (
    <div
      className="print-item"
      style={{
        border: '1px solid #ddd',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        textAlign: 'center',
        pageBreakInside: 'avoid',
      }}
    >
      {/* QR 코드 */}
      <div
        className="print-barcode"
        style={{
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* 주문번호 텍스트 */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: '10px 8px',
          borderRadius: '4px',
          border: '1px solid #e0e0e0',
        }}
      >
        <p
          style={{
            margin: '0 0 5px 0',
            fontSize: '12px',
            color: '#999',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          주문번호
        </p>
        <p
          style={{
            margin: '0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#000',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          {orderNumber}
        </p>
      </div>

      {/* 번호 표시 */}
      <p
        style={{
          margin: '8px 0 0 0',
          fontSize: '11px',
          color: '#aaa',
        }}
      >
        #{index + 1}
      </p>
    </div>
  );
}
