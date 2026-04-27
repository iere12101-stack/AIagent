import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { RouteStateSync } from '@/components/layout/RouteStateSync'

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (!token) {
    redirect('/login')
  }

  const supabase = createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    redirect('/login')
  }

  return (
    <AppShell>
      <RouteStateSync />
      {children}
    </AppShell>
  )
}
