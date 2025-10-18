'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import type { DocContent } from '@/lib/docs/get-doc-content';

interface PDFDownloadButtonProps {
  doc: DocContent;
}

export default function PDFDownloadButton({ doc }: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      // jsPDF 동적 import (번들 크기 최적화)
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // 문서 컨텐츠 캡처
      const content = document.querySelector('.markdown-content');
      if (!content) {
        throw new Error('Content not found');
      }

      const canvas = await html2canvas(content as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download
      const filename = `${doc.metadata.title.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF 다운로드에 실패했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      <Download className="h-4 w-4" />
      {isDownloading ? '다운로드 중...' : 'PDF'}
    </button>
  );
}
