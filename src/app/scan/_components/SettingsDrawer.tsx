'use client';

import * as React from 'react';
import { X, Smartphone, Zap, Vibrate, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCameraState,
  useCameraActions,
} from '@/features/camera';
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
 */
export function SettingsDrawer({
  open,
  onClose,
  settings,
  onSettingsChange,
}: SettingsDrawerProps) {
  const { devices } = useCameraState();
  const { selectDevice, startStream } = useCameraActions();
  const { lastCameraId, rememberCamera, saveLastCamera, toggleRememberCamera } =
    useLastUsedCamera();

  const handleCameraChange = async (deviceId: string) => {
    try {
      // 1. 디바이스 선택
      await selectDevice(deviceId);

      // 2. 스트림 시작
      await startStream();

      // 3. LocalStorage에 저장
      saveLastCamera(deviceId);

      console.log('✅ 카메라가 변경되었습니다:', deviceId);
    } catch (error) {
      console.error('❌ 카메라 변경 실패:', error);
    }
  };

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
                      {device.label || `카메라 ${device.deviceId.slice(0, 8)}`}
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
              onChange={(checked) => onSettingsChange({ autoFocus: checked })}
            />

            <SettingToggle
              label="진동 피드백"
              description="바코드 스캔 성공 시 진동합니다"
              checked={settings.vibrationEnabled}
              onChange={(checked) =>
                onSettingsChange({ vibrationEnabled: checked })
              }
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
    </>
  );
}

/**
 * 토글 설정 항목 컴포넌트
 */
function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-200 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
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
