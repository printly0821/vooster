/**
 * 바코드 인쇄 페이지 헤더 컴포넌트
 */
interface PrintHeaderProps {
  title: string;
  subtitle: string;
}

export const PrintHeader = ({ title, subtitle }: PrintHeaderProps) => {
  return (
    <div
      className="print-header"
      style={{
        textAlign: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #333',
      }}
    >
      <h1
        style={{
          fontSize: '28px',
          margin: '0 0 10px 0',
          color: '#000',
          fontWeight: 'bold',
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#666',
          margin: '0',
        }}
      >
        {subtitle}
      </p>
    </div>
  );
};
