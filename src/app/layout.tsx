import type { Metadata } from "next";
import { Noto_Sans_KR, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { loadCurrentUser } from "@/features/auth/server/load-current-user";
import { CurrentUserProvider } from "@/features/auth/context/current-user-context";

// 한글 최적화 폰트 - Noto Sans KR
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// 영문 폰트 - Inter
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

// 코드/숫자 폰트 - JetBrains Mono
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "바코드 주문 조회",
  description: "카메라로 바코드를 스캔하여 주문 정보를 빠르게 확인하는 웹 애플리케이션",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    minimumScale: 1,
    userScalable: false,
  },
  // iOS와 Android의 Safe Area Inset 활성화
  // iOS: viewport-fit=cover는 Safari에서 노치/Dynamic Island 대응
  // Android: viewport-fit=cover는 Chrome 90+에서 Edge-to-edge 렌더링 활성화
  other: {
    "viewport-fit": "cover",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await loadCurrentUser();

  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`antialiased ${notoSansKr.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <Providers>
          <CurrentUserProvider initialState={currentUser}>
            {children}
          </CurrentUserProvider>
        </Providers>
      </body>
    </html>
  );
}
