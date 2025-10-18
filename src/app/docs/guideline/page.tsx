import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('guideline');
}

export default function GuidelinePage() {
  return <DocPage slug="guideline" />;
}
