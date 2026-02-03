import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === 'true'

// Simple in-memory cache for auth state (per-request, not persistent)
const AUTH_TIMEOUT_MS = 10000 // 10 second timeout for auth check

export async function middleware(request: NextRequest) {
  // Skip middleware if backend is disabled
  if (!USE_BACKEND) {
    return NextResponse.next()
  }

  // Skip middleware for API routes and static assets
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')) {
    return NextResponse.next()
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired - with timeout and error handling
    let user = null
    try {
      // Add timeout to prevent hanging
      const authPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), AUTH_TIMEOUT_MS)
      )

      const { data } = await Promise.race([authPromise, timeoutPromise]) as { data: { user: any } }
      user = data?.user
    } catch {
      // Silently continue - let the app handle auth state
      // Check if there's a session cookie as fallback
      const hasSessionCookie = request.cookies.getAll().some(c =>
        c.name.includes('supabase') && c.name.includes('auth')
      )
      if (hasSessionCookie && pathname.startsWith('/dashboard')) {
        // User likely has a session, let them through
        return supabaseResponse
      }
    }

    // Protected routes
    if (pathname.startsWith('/dashboard')) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        return NextResponse.redirect(url)
      }
    }

    // Auth routes - redirect to dashboard if already logged in
    if (pathname.startsWith('/auth/login') ||
      pathname.startsWith('/auth/register')) {
      if (user) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/customers'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch {
    // Allow request to proceed if middleware fails
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Only match page routes, not API or static
    '/dashboard/:path*',
    '/auth/:path*',
    '/',
  ],
}
