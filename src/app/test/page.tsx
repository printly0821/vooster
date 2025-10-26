export default function TestPage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>배포 테스트 페이지</h1>
      <p>배포가 정상적으로 진행되었습니다! ✅</p>
      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <p>타임스탐프: {new Date().toLocaleString('ko-KR')}</p>
        <p>환경: {process.env.NODE_ENV}</p>
      </div>
    </div>
  );
}
