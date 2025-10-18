import { Suspense } from 'react';
import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import BarcodeGuideLoading from './loading';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('barcode-guide');
}

export default function BarcodeGuidePage() {
  return (
    <Suspense fallback={<BarcodeGuideLoading />}>
      <DocPage slug="barcode-guide" />
    </Suspense>
  );
}
