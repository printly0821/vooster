/**
 * 세컨드 모니터 컨트롤러 페이지
 */

import { Metadata } from 'next';
import { MonitorController } from '@/features/monitor/components/MonitorController';

export const metadata: Metadata = {
  title: '세컨드 모니터 - 바코드 주문 조회',
  description: '스마트폰과 연동하여 주문 정보를 표시하는 세컨드 모니터 제어',
};

export default function MonitorPage() {
  const serverUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:3000';
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://app.example.com';
  const orderFormUrlTemplate = process.env.NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE;

  // 토큰 가져오기 (실제 구현에서는 사용자 인증 후 토큰 획득)
  const token = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN || 'test-token';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            세컨드 모니터
          </h1>
          <p className="text-gray-600">
            바코드 스캔 시 주문 정보를 표시합니다
          </p>
        </div>

        {/* 컨트롤러 */}
        <MonitorController
          serverUrl={serverUrl}
          token={token}
          appBaseUrl={appBaseUrl}
          orderFormUrlTemplate={orderFormUrlTemplate}
          onNavigate={(orderNo) => {
            console.log('주문 네비게이션:', orderNo);
          }}
          onStatusChange={(state) => {
            console.log('상태 변경:', state);
          }}
        />

        {/* 안내 메시지 */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <h3 className="font-semibold mb-2">💡 사용 방법</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>스마트폰에서 QR 코드를 스캔합니다</li>
            <li>페어링이 완료되면 '페어링 상태'에 '완료됨'이 표시됩니다</li>
            <li>스마트폰에서 바코드를 스캔하면 제작의뢰서가 자동으로 열립니다</li>
            <li>팝업 차단이 발생하면 브라우저 설정을 확인해주세요</li>
          </ul>
        </div>

        {/* 문제 해결 */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <h3 className="font-semibold mb-2">⚙️ 문제 해결</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>연결 안됨:</strong> 서버 URL과 포트를 확인해주세요
            </li>
            <li>
              <strong>QR 코드 표시 안됨:</strong> 브라우저 콘솔을 확인해주세요
            </li>
            <li>
              <strong>팝업 안 열림:</strong> 팝업 차단 설정을 해제해주세요
            </li>
            <li>
              <strong>멀티 모니터 미작동:</strong> 크롬/엣지 브라우저 사용을 권장합니다
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
