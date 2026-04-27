import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { LoginPage } from '@/components/pages/LoginPage'

export default async function LoginRoutePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (token) {
    const supabase = createServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (!error && user) {
      redirect('/dashboard')
    }
  }

  return <LoginPage />
}
