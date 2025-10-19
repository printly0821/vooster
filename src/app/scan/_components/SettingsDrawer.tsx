'use client';

import * as React from 'react';
import { X, Smartphone, Zap, Vibrate, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCameraState,
  useCameraActions,
} from '@/features/camera';
import { getCameraDisplayName } from '@/features/camera/lib/device-utils';
import { useLastUsedCamera } from '../_hooks/useLastUsedCamera';
import { ScannerSettings, COOLDOWN_OPTIONS } from '../_types/settings';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  settings: ScannerSettings;
  onSettingsChange: (settings: Partial<ScannerSettings>) => void;
}

/**
 * 설정 드로어 컴포넌트
 * - 카메라 선택 (핵심)
 * - 플래시 모드
 * - 자동 초점
 * - 진동 피드백
 * - 쿨다운 시간
 * - 마지막 카메라 기억
 *
 * P1-3: React.memo로 최적화
 */
export const SettingsDrawer = React.memo<SettingsDrawerProps>(
  function SettingsDrawer({
    open,
    onClose,
    settings,
    onSettingsChange,
  }: SettingsDrawerProps) {
  const { devices, stream, selectedDevice } = useCameraState();
  const { selectDevice, startStream } = useCameraActions();
  const { lastCameraId, rememberCamera, saveLastCamera, toggleRememberCamera } =
    useLastUsedCamera();

  // 미리보기 video ref
  const previewVideoRef = React.useRef<HTMLVideoElement>(null);

  // 토스트 상태
  const [showToast, setShowToast] = React.useState(false);
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // P1-2: 에러 상태
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const errorTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // 초기화 진행 중 플래그 (중복 호출 방지)
  const isInitializingRef = React.useRef(false);

  // P1-1: 카메라 전환 중복 방지 (useRef)
  const isChangingCameraRef = React.useRef(false);

  // 카메라 미리보기 스트림 연결
  React.useEffect(() => {
    if (!stream || !previewVideoRef.current) return;

    const currentStream = previewVideoRef.current.srcObject as MediaStream | null;
    if (currentStream && currentStream.id === stream.id) return;

    const video = previewVideoRef.current;
    video.srcObject = stream;

    const playWithRetry = async (maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (video.paused) await video.play();
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
          }
        }
      }
    };

    playWithRetry().catch(console.error);
  }, [stream]);

  // P1-3: SettingToggle onChange 핸들러들을 useCallback으로 안정화
  const handleAutoFocusChange = React.useCallback((checked: boolean) => {
    onSettingsChange({ autoFocus: checked });
  }, [onSettingsChange]);

  const handleVibrationChange = React.useCallback((checked: boolean) => {
    onSettingsChange({ vibrationEnabled: checked });
  }, [onSettingsChange]);

  // P1-1: useCallback으로 감싸고 중복 방지 로직 추가
  const handleCameraChange = React.useCallback(async (deviceId: string) => {
    // P1-1: 중복 클릭 방지
    if (isChangingCameraRef.current) {
      console.warn('⚠️ 카메라 변경 중입니다. 잠시만 기다려주세요.');
      return;
    }

    try {
      isChangingCameraRef.current = true;

      // 선택된 카메라 정보 조회
      const selectedCameraDevice = devices.find(d => d.deviceId === deviceId);

      // 1. 디바이스 선택
      await selectDevice(deviceId);

      // 2. 스트림 시작
      await startStream();

      // 3. LocalStorage에 저장
      saveLastCamera(deviceId);

      // 4. 토스트 표시
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setShowToast(true);
      toastTimeoutRef.current = setTimeout(() => {
        setShowToast(false);
      }, 1500);

      // 5. 디버그 정보 출력
      console.log('✅ 카메라가 변경되었습니다:', {
        deviceId,
        displayName: selectedCameraDevice ? getCameraDisplayName(selectedCameraDevice) : '불명',
        facingMode: selectedCameraDevice?.facingMode,
        label: selectedCameraDevice?.label,
      });
    } catch (error) {
      console.error('❌ 카메라 변경 실패:', error);

      // P1-2: 에러 메시지 설정
      const errorMessage = error instanceof Error
        ? error.message
        : '카메라를 시작할 수 없습니다';

      setCameraError(errorMessage);

      // 5초 후 자동 해제
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setCameraError(null);
      }, 5000);
    } finally {
      isChangingCameraRef.current = false;
    }
  }, [devices, selectDevice, startStream, saveLastCamera]);
  // ⚠️ isChangingCameraRef는 deps에 포함하지 않음 (useRef는 무시)

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // 드로어 열 때 카메라 자동 초기화 (P0-1 개선)
  React.useEffect(() => {
    if (!open) {
      // 드로어가 닫히면 초기화 플래그 리셋
      isInitializingRef.current = false;
      return;
    }

    // 이미 초기화 진행 중이면 스킵
    if (isInitializingRef.current) {
      console.log('⏭️ SettingsDrawer: 이미 초기화 진행 중');
      return;
    }

    const initializeCamera = async () => {
      try {
        // 1. 이미 stream이 있으면 스킵
        if (stream) {
          console.log('✅ SettingsDrawer: 기존 stream 사용');
          return;
        }

        // 2. devices가 없으면 대기
        if (devices.length === 0) {
          console.log('⏳ SettingsDrawer: devices 로딩 대기 중');
          return;
        }

        // 3. 복원할 카메라 결정 (lastCameraId 우선)
        const targetId = lastCameraId || devices[0]?.deviceId;
        if (!targetId) {
          console.warn('⚠️ SettingsDrawer: 사용 가능한 카메라 없음');
          return;
        }

        console.log('🎬 SettingsDrawer: 카메라 초기화 시작', targetId);
        isInitializingRef.current = true;

        // 4. selectedDevice와 다르면 선택
        if (selectedDevice?.deviceId !== targetId) {
          await selectDevice(targetId);
          console.log('✅ SettingsDrawer: 디바이스 선택 완료');
        }

        // 5. stream 이미 시작되었는지 다시 확인 (selectDevice가 시작했을 수 있음)
        if (stream) {
          console.log('✅ SettingsDrawer: selectDevice에서 이미 stream 시작됨');
          return;
        }

        // 6. stream 시작 (selectDevice 후에도 없으면 시작)
        await startStream();
        console.log('✅ SettingsDrawer: 미리보기 준비 완료');
      } catch (error) {
        // "Stream start already in progress" 에러는 무시 (정상 동작)
        if (error instanceof Error &&
            error.message.includes('Stream start already in progress')) {
          console.log('✅ SettingsDrawer: stream 이미 시작됨 (정상)');
          return;
        }
        console.error('❌ SettingsDrawer: 카메라 초기화 실패', error);
      } finally {
        isInitializingRef.current = false;
      }
    };

    initializeCamera();
  }, [open, stream, devices, lastCameraId, selectedDevice]);

  if (!open) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 드로어 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">설정</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 설정 섹션 */}
        <div className="p-4 space-y-6">
          {/* 📹 카메라 설정 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">카메라 설정</h3>
            </div>

            {/* 📹 카메라 미리보기 */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                현재 카메라 미리보기
              </label>
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '250px' }}>
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* 스캔 가이드라인 오버레이 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* 어두운 배경 */}
                  <div className="absolute inset-0 bg-black/30" />

                  {/* 스캔 프레임 */}
                  <div
                    className="relative border-2 border-white/80 rounded-lg"
                    style={{
                      width: '80%',
                      maxWidth: '280px',
                      aspectRatio: '16/9',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {/* 모서리 마커 */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl-sm" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr-sm" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl-sm" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white rounded-br-sm" />
                  </div>
                </div>

                {/* 스트림 없음 상태 - 로딩 UI (P0-3) */}
                {!stream && (
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center justify-center space-y-3">
                    {/* 스피너 */}
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>

                    {/* 상태 메시지 */}
                    <div className="text-center space-y-1">
                      <p className="text-white text-sm font-medium">
                        {selectedDevice ? '카메라 준비 중...' : '카메라를 선택해주세요'}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {devices.length > 0
                          ? '카메라를 선택하면 미리보기가 표시됩니다'
                          : '사용 가능한 카메라를 찾는 중...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 카메라 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                사용할 카메라 선택
              </label>
              {devices.length > 0 ? (
                <select
                  value={lastCameraId || devices[0]?.deviceId || ''}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'border border-gray-300',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'text-gray-900 bg-white'
                  )}
                >
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {getCameraDisplayName(device)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
                  사용 가능한 카메라가 없습니다
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                전면/후면 카메라 중 선택합니다
              </p>

              {/* P1-2: 에러 메시지 표시 */}
              {cameraError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 text-lg shrink-0">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-medium">{cameraError}</p>
                      <button
                        onClick={() => setCameraError(null)}
                        className="mt-1 text-xs text-red-600 underline hover:text-red-800"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 마지막 카메라 기억 */}
            <SettingToggle
              label="마지막 카메라 기억"
              description="다음 실행 시 이 카메라를 자동으로 선택합니다"
              checked={rememberCamera}
              onChange={toggleRememberCamera}
            />
          </section>

          {/* 💡 플래시 설정 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">플래시</h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                플래시 모드
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['off', 'auto', 'on'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onSettingsChange({ flashMode: mode })}
                    className={cn(
                      'py-2 px-3 rounded-lg font-medium text-sm transition-all',
                      settings.flashMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {mode === 'off' ? '꺼짐' : mode === 'auto' ? '자동' : '켜짐'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                자동: 조도에 따라 자동 조절
              </p>
            </div>
          </section>

          {/* 🎯 포커스 및 피드백 설정 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Vibrate className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">피드백</h3>
            </div>

            <SettingToggle
              label="자동 초점"
              description="스캔 시 자동으로 초점을 맞춥니다"
              checked={settings.autoFocus}
              onChange={handleAutoFocusChange}
            />

            <SettingToggle
              label="진동 피드백"
              description="바코드 스캔 성공 시 진동합니다"
              checked={settings.vibrationEnabled}
              onChange={handleVibrationChange}
            />
          </section>

          {/* ⏱️ 스캔 설정 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">스캔 설정</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  중복 방지 쿨다운: {settings.cooldownMs}ms
                </label>
                <input
                  type="range"
                  min="1000"
                  max="3000"
                  step="250"
                  value={settings.cooldownMs}
                  onChange={(e) =>
                    onSettingsChange({ cooldownMs: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1초</span>
                  <span>3초</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  같은 바코드를 여러 번 스캔하지 못하도록 방지합니다
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  타임아웃: {settings.timeoutSeconds}초
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((seconds) => (
                    <button
                      key={seconds}
                      onClick={() =>
                        onSettingsChange({ timeoutSeconds: seconds })
                      }
                      className={cn(
                        'py-2 px-3 rounded-lg font-medium text-sm transition-all',
                        settings.timeoutSeconds === seconds
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {seconds}초
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  설정된 시간 동안 스캔이 없으면 자동 종료됩니다
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* 하단 패딩 */}
        <div className="h-8" />
      </div>

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span>✓</span>
            <span className="text-sm font-medium">적용되었습니다</span>
          </div>
        </div>
      )}
    </>
  );
  }
);

/**
 * 토글 설정 항목 컴포넌트
 * P1-3: React.memo로 최적화
 */
interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SettingToggle = React.memo<SettingToggleProps>(
  function SettingToggle({ label, description, checked, onChange }) {
    // P1-3: useCallback으로 핸들러 안정화
    const handleClick = React.useCallback(() => {
      onChange(!checked);
    }, [checked, onChange]);

    return (
      <div className="flex items-start justify-between py-3 border-b border-gray-200 last:border-0">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={handleClick}
          className={cn(
            'relative inline-flex w-12 h-6 items-center rounded-full transition-colors',
            'ml-3 shrink-0',
            checked ? 'bg-blue-600' : 'bg-gray-300'
          )}
          role="switch"
          aria-checked={checked}
        >
          <span
            className={cn(
              'inline-block w-5 h-5 rounded-full bg-white transition-transform',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    );
  }
);
