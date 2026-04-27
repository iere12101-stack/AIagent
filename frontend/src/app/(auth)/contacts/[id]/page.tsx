import { ContactDetailRoute } from '@/components/routes/ContactDetailRoute'

type ContactDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params
  return <ContactDetailRoute contactId={id} />
}
