'use client';

import * as React from 'react';
import { CameraUIExample } from '@/features/camera/examples/UIComponentsUsage';
import { BarcodeScannerExample } from '@/features/camera/examples/BarcodeScannerUsage';

type Tab = 'camera' | 'barcode';

export default function CameraTestPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('barcode');

  return (
    <div className="min-h-screen bg-background">
      {/* Tab Navigation */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="flex gap-1 pt-4">
            <button
              onClick={() => setActiveTab('barcode')}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
                activeTab === 'barcode'
                  ? 'bg-background text-foreground border-t border-x'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              📸 바코드 스캔
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
                activeTab === 'camera'
                  ? 'bg-background text-foreground border-t border-x'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              🎥 카메라 테스트
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-8">
        {activeTab === 'barcode' && <BarcodeScannerExample />}
        {activeTab === 'camera' && <CameraUIExample />}
      </div>
    </div>
  );
}
