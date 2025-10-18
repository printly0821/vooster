import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('field-analysis');
}

export default function FieldAnalysisPage() {
  return <DocPage slug="field-analysis" />;
}
