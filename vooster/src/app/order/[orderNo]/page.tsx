"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type PageProps = {
  params: Promise<{ orderNo: string }>;
};

// 목업 데이터
const MOCK_ORDER = {
  orderNo: "MOCK-12345",
  customerName: "(주)모크컴퍼니",
  status: "인쇄중",
  quantity: "1,000개",
  options: ["양면 컬러", "무광코팅"],
  thumbnails: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    url: `https://picsum.photos/seed/${i + 1}/300/300`,
  })),
};

export default function OrderDetailPage({ params }: PageProps) {
  const { orderNo } = use(params);

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-64px)] flex-col pb-20 md:min-h-[calc(100vh-72px)]">
        {/* 뒤로가기 버튼 */}
        <div className="border-b border-border bg-background p-4">
          <div className="container">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                뒤로가기
              </Button>
            </Link>
          </div>
        </div>

        {/* 주문 정보 & 썸네일 그리드 */}
        <div className="flex-1 overflow-y-auto">
          <div className="container py-6">
            <div className="space-y-6">
              {/* 주문 정보 헤더 카드 */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>주문번호: {MOCK_ORDER.orderNo}</CardTitle>
                      <CardDescription>
                        고객명: {MOCK_ORDER.customerName}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{MOCK_ORDER.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-muted-foreground">
                        수량
                      </dt>
                      <dd className="font-semibold">{MOCK_ORDER.quantity}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-muted-foreground">
                        옵션
                      </dt>
                      <dd className="font-semibold">
                        {MOCK_ORDER.options.join(", ")}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* 썸네일 그리드 */}
              <div>
                <h2 className="mb-4 text-lg font-semibold">
                  주문 이미지 ({MOCK_ORDER.thumbnails.length}장)
                </h2>
                <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
                  {MOCK_ORDER.thumbnails.map((thumbnail) => (
                    <div
                      key={thumbnail.id}
                      className="overflow-hidden rounded-lg border border-border bg-muted transition-all hover:border-primary hover:shadow-md"
                    >
                      <AspectRatio ratio={1}>
                        <img
                          src={thumbnail.url}
                          alt={`썸네일 ${thumbnail.id}`}
                          className="h-full w-full object-cover"
                        />
                      </AspectRatio>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 고정 액션 바 */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 shadow-lg">
          <div className="container">
            <Link href="/">
              <Button size="lg" className="w-full gap-2">
                <Package className="h-5 w-5" />
                다음 주문 스캔
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
