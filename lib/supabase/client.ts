/**
 * Supabase Browser Client
 * Used in Client Components for authenticated requests
 * Uses singleton pattern to reuse connection
 */

import { createBrowserClient as createClient } from '@supabase/ssr'
import type { Database } from './types'

let browserClient: ReturnType<typeof createClient<Database>> | null = null

export function createBrowserClient() {
  if (!browserClient) {
    browserClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
