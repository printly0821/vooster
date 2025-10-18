import { redirect } from 'next/navigation';

export default function DocsPage() {
  // 첫 번째 문서로 리다이렉트 (바코드 가이드 - 공개)
  redirect('/docs/barcode-guide');
}
