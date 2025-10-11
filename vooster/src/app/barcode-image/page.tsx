'use client';

/**
 * 바코드 테스트용 이미지 페이지
 *
 * 이 페이지를 스마트폰이나 다른 모니터에 띄워서
 * 바코드 스캐너로 테스트할 수 있습니다.
 */
export default function BarcodeImagePage() {
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      backgroundColor: 'white',
      minHeight: '100vh',
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: 'black' }}>
        📱 바코드 테스트 이미지
      </h1>

      <p style={{ marginBottom: '40px', color: '#666' }}>
        이 페이지를 스마트폰이나 다른 화면에 띄우고<br />
        PC 카메라로 스캔해보세요!
      </p>

      {/* QR Code 1 */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', color: 'black' }}>
          QR 코드 테스트 #1
        </h2>
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Hello%20Vooster%20QR%20Scanner!"
          alt="QR Code 1"
          style={{
            border: '2px solid #ddd',
            padding: '20px',
            backgroundColor: 'white',
          }}
        />
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          데이터: "Hello Vooster QR Scanner!"
        </p>
      </div>

      {/* QR Code 2 */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', color: 'black' }}>
          QR 코드 테스트 #2
        </h2>
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://github.com/printly0821/vooster"
          alt="QR Code 2"
          style={{
            border: '2px solid #ddd',
            padding: '20px',
            backgroundColor: 'white',
          }}
        />
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          데이터: "https://github.com/printly0821/vooster"
        </p>
      </div>

      {/* Barcode (Code 128) */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', color: 'black' }}>
          바코드 테스트 (Code 128)
        </h2>
        <img
          src="https://barcode.tec-it.com/barcode.ashx?data=VOOSTER2024&code=Code128&translate-esc=on"
          alt="Barcode"
          style={{
            border: '2px solid #ddd',
            padding: '20px',
            backgroundColor: 'white',
          }}
        />
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          데이터: "VOOSTER2024"
        </p>
      </div>

      {/* EAN-13 Barcode */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', color: 'black' }}>
          EAN-13 바코드 (일반 제품 바코드)
        </h2>
        <img
          src="https://barcode.tec-it.com/barcode.ashx?data=4006381333634&code=EAN13"
          alt="EAN13 Barcode"
          style={{
            border: '2px solid #ddd',
            padding: '20px',
            backgroundColor: 'white',
          }}
        />
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          데이터: "4006381333634" (예시 EAN-13)
        </p>
      </div>

      <div style={{
        marginTop: '60px',
        padding: '20px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
      }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          💡 <strong>사용 방법:</strong><br />
          1. 이 페이지를 스마트폰이나 다른 모니터에 띄우기<br />
          2. /camera-test 페이지에서 바코드 스캐너 시작<br />
          3. 카메라를 위 이미지들에 비추기<br />
          4. 콘솔(F12)에서 인식 결과 확인하기
        </p>
      </div>
    </div>
  );
}
