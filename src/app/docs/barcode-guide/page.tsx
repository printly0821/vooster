import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('barcode-guide');
}

export default function BarcodeGuidePage() {
  return <DocPage slug="barcode-guide" />;
}
