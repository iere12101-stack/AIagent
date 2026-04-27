import { FlowBuilderRoute } from '@/components/routes/FlowBuilderRoute'

type FlowBuilderPageProps = {
  params: Promise<{ id: string }>
}

export default async function FlowBuilderPage({ params }: FlowBuilderPageProps) {
  const { id } = await params
  return <FlowBuilderRoute flowId={id} />
}
