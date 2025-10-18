'use client';

import { MainLayout } from '@/components/layout';
import { ExampleStatus } from '@/features/example/components/example-status';

export default function ExamplePage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-background px-6 py-16 text-foreground">
        <ExampleStatus />
      </div>
    </MainLayout>
  );
}
