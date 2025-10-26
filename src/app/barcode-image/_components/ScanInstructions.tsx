/**
 * 스캔 안내 컴포넌트
 */
export const ScanInstructions = () => {
  return (
    <div
      className="print-hide"
      style={{
        backgroundColor: '#f3e5f5',
        border: '1px solid #9c27b0',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '20px',
        color: '#4a148c',
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: 'bold',
        }}
      >
        📱 스캔 방법
      </h3>
      <p
        style={{
          margin: '0 0 10px 0',
          fontSize: '14px',
        }}
      >
        생성된 바코드를 스캔하려면:
      </p>
      <ol
        style={{
          margin: '0',
          paddingLeft: '20px',
          lineHeight: '1.6',
          fontSize: '14px',
        }}
      >
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
  );
};
