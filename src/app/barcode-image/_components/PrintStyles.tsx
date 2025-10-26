/**
 * 인쇄용 스타일 컴포넌트
 */
export const PrintStyles = () => {
  return (
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
  );
};
