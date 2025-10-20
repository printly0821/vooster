/**
 * /scan 페이지 전용 Layout
 *
 * Vercel 배포 에러 해결:
 * - 루트 layout.tsx의 loadCurrentUser() Supabase 호출 우회
 * - Next.js 15 Server Component에서 cookies 수정 불가 에러 방지
 * - 바코드 스캔은 인증 불필요한 public 기능
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/cookies
 */

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // loadCurrentUser() 호출 안 함 → Supabase cookies 설정 우회
  // CurrentUserProvider 없음 → Auth 상태 불필요
  // 바코드 스캔은 public 기능

  return children;
}
