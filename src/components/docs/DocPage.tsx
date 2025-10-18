import 'server-only';

import { getDocContent } from '@/lib/docs/get-doc-content';
import MarkdownContent from '@/components/docs/MarkdownContent';
import TableOfContents from '@/components/docs/TableOfContents';
import { redirect } from 'next/navigation';
import { loadCurrentUser } from '@/features/auth/server/load-current-user';

interface DocPageProps {
  slug: string;
}

export async function DocPage({ slug }: DocPageProps) {
  const doc = await getDocContent(slug);

  // 비공개 문서는 인증 필요
  if (!doc.metadata.public) {
    const user = await loadCurrentUser();
    if (!user) {
      redirect('/login?redirect=/docs/' + slug);
    }
  }

  return (
    <div className="flex w-full gap-8">
      <MarkdownContent doc={doc} />
      <TableOfContents toc={doc.toc} />
    </div>
  );
}

export async function generateDocMetadata(slug: string) {
  const doc = await getDocContent(slug);
  return {
    title: doc.metadata.title,
    description: doc.metadata.description,
  };
}
