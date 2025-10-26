'use client';

import { MainLayout } from '@/components/layout';

/**
 * 바코드 그리드 인쇄 페이지
 *
 * 주문번호들을 그리드 형태로 배치하여
 * 인쇄하기 쉽도록 구성된 페이지입니다.
 */
export default function BarcodeImagePage() {
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
      <div style={{
        padding: '20px',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          {/* 헤더 */}
          <div className="print-header" style={{
            textAlign: 'center',
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '2px solid #333',
          }}>
            <h1 style={{
              fontSize: '28px',
              margin: '0 0 10px 0',
              color: '#000',
              fontWeight: 'bold',
            }}>
              📦 주문번호 바코드 인쇄
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#666',
              margin: '0',
            }}>
              {orderNumbers.length}개 주문 | Code 128 바코드
            </p>
          </div>

          {/* 바코드 그리드 */}
          <div className="print-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }}>
            {orderNumbers.map((orderNumber, index) => (
              <div
                key={orderNumber}
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
                {/* 바코드 */}
                <div className="print-barcode" style={{
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '80px',
                }}>
                  <img
                    src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
                      orderNumber
                    )}&code=Code128&translate-esc=on&unit=Cm&dpi=300`}
                    alt={`Barcode ${orderNumber}`}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                </div>

                {/* 주문번호 텍스트 */}
                <div style={{
                  backgroundColor: '#fff',
                  padding: '10px 8px',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0',
                }}>
                  <p style={{
                    margin: '0 0 5px 0',
                    fontSize: '12px',
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    주문번호
                  </p>
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#000',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}>
                    {orderNumber}
                  </p>
                </div>

                {/* 번호 표시 */}
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '11px',
                  color: '#aaa',
                }}>
                  #{index + 1}
                </p>
              </div>
            ))}
          </div>

          {/* 인쇄 안내 */}
          <div className="print-hide" style={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196F3',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '40px',
            color: '#0d47a1',
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: 'bold',
            }}>
              💡 인쇄 방법
            </h3>
            <ul style={{
              margin: '0',
              paddingLeft: '20px',
              lineHeight: '1.6',
              fontSize: '14px',
            }}>
              <li>Ctrl+P 또는 Cmd+P를 눌러 인쇄 대화 열기</li>
              <li>용지 크기: A4 권장</li>
              <li>방향: 가로(Landscape) 권장</li>
              <li>여백: 최소(Minimal) 또는 없음(None) 선택</li>
              <li>배경 그래픽: 활성화</li>
              <li>인쇄 미리보기에서 모든 바코드가 표시되는지 확인 후 인쇄</li>
            </ul>
          </div>

          {/* 스캔 안내 */}
          <div className="print-hide" style={{
            backgroundColor: '#f3e5f5',
            border: '1px solid #9c27b0',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px',
            color: '#4a148c',
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: 'bold',
            }}>
              📱 스캔 방법
            </h3>
            <p style={{
              margin: '0 0 10px 0',
              fontSize: '14px',
            }}>
              생성된 바코드를 스캔하려면:
            </p>
            <ol style={{
              margin: '0',
              paddingLeft: '20px',
              lineHeight: '1.6',
              fontSize: '14px',
            }}>
              <li>
                <a
                  href="/scan"
                  style={{
                    color: '#9c27b0',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                  }}
                >
                  /scan 페이지
                </a>
                로 이동
              </li>
              <li>카메라 권한 승인</li>
              <li>바코드에 카메라를 가져다대기</li>
              <li>자동으로 주문 정보 조회됨</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 인쇄 스타일 */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          div {
            break-inside: avoid;
          }

          img {
            break-inside: avoid;
          }

          /* 헤더 스타일 */
          .print-header {
            margin-bottom: 20px !important;
            padding-bottom: 10px !important;
          }

          /* 그리드 스타일 */
          .print-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 15px !important;
            margin-bottom: 0 !important;
          }

          /* 바코드 아이템 스타일 */
          .print-item {
            border: 1px solid #999 !important;
            padding: 15px !important;
            border-radius: 4px !important;
            background-color: #fff !important;
          }

          /* 바코드 컨테이너 스타일 */
          .print-barcode {
            margin-bottom: 8px !important;
            min-height: 60px !important;
          }

          /* 인쇄 시 숨김 */
          .print-hide {
            display: none !important;
          }
        }
      `}</style>
    </MainLayout>
  );
}
