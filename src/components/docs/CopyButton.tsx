'use client';

import { useState, useCallback } from 'react';
import { Check, Copy as CopyIcon } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);

      // 2초 후 아이콘 원상복구
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title={isCopied ? '복사됨!' : '코드 복사'}
      aria-label={isCopied ? '복사됨!' : '코드 복사'}
      className={`absolute right-2 top-2 rounded-lg bg-gray-700 p-2 text-gray-300 transition-all hover:bg-gray-600 hover:text-white ${
        isCopied ? 'bg-green-600 text-green-100' : ''
      } ${className}`}
    >
      {isCopied ? (
        <Check className="h-4 w-4" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </button>
  );
}
