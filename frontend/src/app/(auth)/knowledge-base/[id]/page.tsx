import { KnowledgeBaseDetailRoute } from '@/components/routes/KnowledgeBaseDetailRoute'

type KnowledgeBaseDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function KnowledgeBaseDetailPage({ params }: KnowledgeBaseDetailPageProps) {
  const { id } = await params
  return <KnowledgeBaseDetailRoute knowledgeBaseId={id} />
}
