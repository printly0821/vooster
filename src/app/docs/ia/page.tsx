import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('ia');
}

export default function IAPage() {
  return <DocPage slug="ia" />;
}
