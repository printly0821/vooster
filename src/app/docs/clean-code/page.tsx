import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('clean-code');
}

export default function CleanCodePage() {
  return <DocPage slug="clean-code" />;
}
