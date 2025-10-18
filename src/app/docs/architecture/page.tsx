import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('architecture');
}

export default function ArchitecturePage() {
  return <DocPage slug="architecture" />;
}
