import { DeviceDetailRoute } from '@/components/routes/DeviceDetailRoute'

type DeviceDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function DeviceDetailPage({ params }: DeviceDetailPageProps) {
  const { id } = await params
  return <DeviceDetailRoute deviceId={id} />
}
