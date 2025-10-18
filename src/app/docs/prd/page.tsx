import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('prd');
}

export default function PRDPage() {
  return <DocPage slug="prd" />;
}
