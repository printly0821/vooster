'use client';

import type { DocContent } from '@/lib/docs/get-doc-content';
import { Copy } from 'lucide-react';
import PDFDownloadButton from './PDFDownloadButton';
import CodeBlockCopy from './CodeBlockCopy';
import './markdown.css';

interface MarkdownContentProps {
  doc: DocContent;
}

export default function MarkdownContent({ doc }: MarkdownContentProps) {
  return (
    <article className="flex-1 max-w-3xl">
      <CodeBlockCopy />
      {/* Header */}
      <header className="mb-8 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-gray-100">
          {doc.metadata.title}
        </h1>
        {doc.metadata.description && (
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {doc.metadata.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {doc.metadata.author && <span>작성자: {doc.metadata.author}</span>}
          {doc.metadata.date && <span>날짜: {doc.metadata.date}</span>}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Copy className="h-4 w-4" />
            복사
          </button>
          <PDFDownloadButton doc={doc} />
        </div>
      </header>

      {/* Content */}
      <div
        className="markdown-content prose prose-gray max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: doc.html }}
      />
    </article>
  );
}
