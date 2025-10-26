/**
 * 인쇄 안내 컴포넌트
 */
export const PrintInstructions = () => {
  return (
    <div
      className="print-hide"
      style={{
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196F3',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '40px',
        color: '#0d47a1',
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: 'bold',
        }}
      >
        💡 인쇄 방법
      </h3>
      <ul
        style={{
          margin: '0',
          paddingLeft: '20px',
          lineHeight: '1.6',
          fontSize: '14px',
        }}
      >
        <li>Ctrl+P 또는 Cmd+P를 눌러 인쇄 대화 열기</li>
        <li>용지 크기: A4 권장</li>
        <li>방향: 가로(Landscape) 권장</li>
        <li>여백: 최소(Minimal) 또는 없음(None) 선택</li>
        <li>배경 그래픽: 활성화</li>
        <li>인쇄 미리보기에서 모든 바코드가 표시되는지 확인 후 인쇄</li>
      </ul>
    </div>
  );
};
