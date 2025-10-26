'use client';

import Link from 'next/link';
import { MainLayout } from '@/components/layout';

/**
 * 바코드 인쇄 메인 페이지
 *
 * Code128 바코드 또는 QR 코드 중 선택하여 인쇄할 수 있습니다.
 */
export default function BarcodeImagePage() {
  return (
    <MainLayout>
      <div
        style={{
          padding: '40px 20px',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            width: '100%',
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '50px',
            }}
          >
            <h1
              style={{
                fontSize: '32px',
                margin: '0 0 10px 0',
                color: '#000',
                fontWeight: 'bold',
              }}
            >
              📦 바코드 인쇄
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: '#666',
                margin: '0',
              }}
            >
              주문번호를 바코드 형태로 인쇄하세요
            </p>
          </div>

          {/* 바코드 타입 선택 카드 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '30px',
            }}
          >
            {/* Code128 카드 */}
            <Link href="/barcode-image/code128" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #2196F3',
                  borderRadius: '12px',
                  padding: '40px 30px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(33,150,243,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {/* 아이콘 */}
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: '20px',
                  }}
                >
                  📊
                </div>

                {/* 제목 */}
                <h2
                  style={{
                    fontSize: '24px',
                    margin: '0 0 12px 0',
                    color: '#2196F3',
                    fontWeight: 'bold',
                  }}
                >
                  Code128 바코드
                </h2>

                {/* 설명 */}
                <p
                  style={{
                    fontSize: '14px',
                    color: '#666',
                    margin: '0 0 20px 0',
                    lineHeight: '1.6',
                  }}
                >
                  가로형 바코드로 스캐너에 최적화된 형식입니다. 물류 및 재고 관리에 적합합니다.
                </p>

                {/* 장점 */}
                <div
                  style={{
                    backgroundColor: '#e3f2fd',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                    color: '#0d47a1',
                  }}
                >
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>✓ 장점</p>
                  <p style={{ margin: 0 }}>• 빠른 스캔 속도</p>
                  <p style={{ margin: 0 }}>• 높은 호환성</p>
                  <p style={{ margin: 0 }}>• 전문 스캐너 지원</p>
                </div>
              </div>
            </Link>

            {/* QR 코드 카드 */}
            <Link href="/barcode-image/qr" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #9c27b0',
                  borderRadius: '12px',
                  padding: '40px 30px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(156,39,176,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {/* 아이콘 */}
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: '20px',
                  }}
                >
                  🔲
                </div>

                {/* 제목 */}
                <h2
                  style={{
                    fontSize: '24px',
                    margin: '0 0 12px 0',
                    color: '#9c27b0',
                    fontWeight: 'bold',
                  }}
                >
                  QR 코드
                </h2>

                {/* 설명 */}
                <p
                  style={{
                    fontSize: '14px',
                    color: '#666',
                    margin: '0 0 20px 0',
                    lineHeight: '1.6',
                  }}
                >
                  2D 정사각형 코드로 스마트폰 카메라로 쉽게 스캔 가능합니다. 모바일 환경에 최적화되어 있습니다.
                </p>

                {/* 장점 */}
                <div
                  style={{
                    backgroundColor: '#f3e5f5',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                    color: '#4a148c',
                  }}
                >
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>✓ 장점</p>
                  <p style={{ margin: 0 }}>• 스마트폰 스캔 가능</p>
                  <p style={{ margin: 0 }}>• 많은 정보 저장</p>
                  <p style={{ margin: 0 }}>• 손상 복원 기능</p>
                </div>
              </div>
            </Link>
          </div>

          {/* 추가 안내 */}
          <div
            style={{
              marginTop: '50px',
              backgroundColor: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: '8px',
              padding: '20px',
              color: '#e65100',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              💡 선택 가이드
            </h3>
            <ul
              style={{
                margin: '0',
                paddingLeft: '20px',
                lineHeight: '1.6',
                fontSize: '14px',
              }}
            >
              <li>
                <strong>Code128</strong>: 전문 바코드 스캐너로 빠르게 스캔해야 하는 경우 (물류, 재고 관리)
              </li>
              <li>
                <strong>QR 코드</strong>: 스마트폰으로 스캔하거나 더 많은 정보를 담아야 하는 경우
              </li>
              <li>두 형식 모두 인쇄 후 /scan 페이지에서 스캔 가능합니다</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
