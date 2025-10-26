/**
 * 대시보드 컴포넌트
 *
 * 페어링 완료 후 디스플레이 정보와 연결 상태를 표시합니다.
 */

import type { DashboardProps } from '../../types/components';
import { Button } from '../shared/Button';

/**
 * Dashboard 컴포넌트
 *
 * @param props - 대시보드 Props
 * @returns 대시보드 화면
 *
 * @example
 * <Dashboard
 *   displayName="메인 디스플레이"
 *   displayId="display-uuid"
 *   connectionStatus="connected"
 *   onUnpair={handleUnpair}
 * />
 */
export function Dashboard(props: DashboardProps) {
  const {
    displayName,
    displayId,
    connectionStatus,
    onUnpair,
    className = '',
    testId,
  } = props;

  // 연결 상태별 스타일
  const statusStyles: Record<string, { color: string; text: string }> = {
    connected: { color: 'text-green-600', text: '연결됨' },
    disconnected: { color: 'text-red-600', text: '연결 끊김' },
    connecting: { color: 'text-yellow-600', text: '연결 중...' },
  };

  const status = statusStyles[connectionStatus];

  return (
    <div
      className={`max-w-md mx-auto p-6 bg-white rounded-lg shadow-md ${className}`}
      data-testid={testId}
    >
      {/* 헤더 */}
      <div className="mb-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          페어링 완료
        </h2>
        <p className="text-gray-600">
          디스플레이가 성공적으로 등록되었습니다
        </p>
      </div>

      {/* 디스플레이 정보 */}
      <div className="mb-6 space-y-4">
        {/* 디스플레이 이름 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">디스플레이 이름</p>
          <p className="text-lg font-semibold text-gray-800">{displayName}</p>
        </div>

        {/* 디스플레이 ID */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">디스플레이 ID</p>
          <p className="text-sm font-mono text-gray-600 break-all">
            {displayId}
          </p>
        </div>

        {/* 연결 상태 */}
        <div className="p-4 bg-gray-50 rounded-lg" data-status={connectionStatus}>
          <p className="text-sm text-gray-500 mb-1">연결 상태</p>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            />
            <p className={`text-lg font-semibold ${status.color}`}>
              {status.text}
            </p>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="space-y-3">
        <Button
          variant="danger"
          onClick={onUnpair}
          className="w-full"
          testId="unpair-button"
        >
          페어링 해제
        </Button>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 이제 모바일 앱에서 이 디스플레이를 제어할 수 있습니다.
          페어링을 해제하려면 위 버튼을 누르세요.
        </p>
      </div>
    </div>
  );
}
