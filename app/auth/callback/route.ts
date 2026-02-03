import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard/customers'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if this is a new registration (pendingRegistration in localStorage)
      // Since we can't access localStorage in server route, we'll check if user has a business
      const { data: existingMember } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', data.user.id)
        .single()

      // If no business exists, create one from registration data
      if (!existingMember) {
        // For new users, we need to get the business data somehow
        // Since we can't access localStorage here, redirect to a client page that will handle it
        return NextResponse.redirect(`${origin}/auth/complete-registration`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login if something went wrong
  return NextResponse.redirect(`${origin}/auth/login`)
}
