import { AgentDetailRoute } from '@/components/routes/AgentDetailRoute'

type AgentDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params
  return <AgentDetailRoute agentId={id} />
}
