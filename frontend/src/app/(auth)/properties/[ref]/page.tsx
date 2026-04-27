import { PropertyDetailRoute } from '@/components/routes/PropertyDetailRoute'

type PropertyDetailPageProps = {
  params: Promise<{ ref: string }>
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { ref } = await params
  return <PropertyDetailRoute propertyRef={ref} />
}
