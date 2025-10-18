import { type ReactNode } from 'react';
import DocLayout from '@/components/docs/DocLayout';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocLayout>{children}</DocLayout>;
}
