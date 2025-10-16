'use client';

import { useRef, useState } from 'react';

/**
 * 가장 단순한 카메라 테스트 페이지
 * 복잡한 컴포넌트 없이 기본 MediaStream API만 사용
 */
export default function SimpleCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('대기 중');
  const [error, setError] = useState('');

  const startCamera = async () => {
    try {
      setStatus('카메라 시작 중...');
      setError('');

      console.log('📸 카메라 권한 요청 중...');

      // 가장 기본적인 카메라 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // 후면 카메라
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      console.log('✅ 카메라 권한 획득 성공!');
      console.log('Stream ID:', stream.id);
      console.log('Video tracks:', stream.getVideoTracks().length);

      if (videoRef.current) {
        console.log('📹 비디오 엘리먼트에 스트림 연결 중...');
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
        console.log('✅ 비디오 재생 시작!');

        setStatus('카메라 실행 중 ✅');
      }
    } catch (err) {
      console.error('❌ 카메라 시작 실패:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('오류 발생 ❌');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        console.log('🛑 트랙 중지:', track.kind);
        track.stop();
      });
      videoRef.current.srcObject = null;
      setStatus('카메라 중지됨');
      console.log('⏹️ 카메라 중지 완료');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        🧪 단순 카메라 테스트
      </h1>

      <div style={{ marginBottom: '20px' }}>
        <p>
          <strong>상태:</strong> {status}
        </p>
        {error && (
          <p style={{ color: 'red' }}>
            <strong>에러:</strong> {error}
          </p>
        )}
      </div>

      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
        }}
      >
        <button
          onClick={startCamera}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          📸 카메라 시작
        </button>
        <button
          onClick={stopCamera}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ⏹️ 카메라 중지
        </button>
      </div>

      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: 'black',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>✅ F12를 눌러서 콘솔을 확인하세요</p>
        <p>✅ "카메라 시작" 버튼을 누르면 카메라 권한을 요청합니다</p>
        <p>✅ 카메라 영상이 위의 검은 박스에 나와야 합니다</p>
      </div>
    </div>
  );
}
