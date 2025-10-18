import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('design-guide');
}

export default function DesignGuidePage() {
  return <DocPage slug="design-guide" />;
}
