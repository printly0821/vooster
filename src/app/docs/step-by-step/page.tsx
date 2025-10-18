import { DocPage, generateDocMetadata } from '@/components/docs/DocPage';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return generateDocMetadata('step-by-step');
}

export default function StepByStepPage() {
  return <DocPage slug="step-by-step" />;
}
