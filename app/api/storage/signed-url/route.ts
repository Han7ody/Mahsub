import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      bucket,
      path,
      expiresIn = 3600,
      download = false,
    }: {
      bucket: 'receipts' | 'avatars'
      path: string
      expiresIn?: number
      download?: boolean
    } = body

    if (!bucket || !path) {
      return NextResponse.json({ signedUrl: null, error: 'Missing bucket or path' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const options: any = {}
    if (download) {
      // Force Content-Disposition: attachment
      const filename = String(path).split('/').pop() || 'receipt'
      options.download = filename
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn, options)

    if (error) {
      return NextResponse.json({ signedUrl: null, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ signedUrl: data?.signedUrl ?? null, error: null })
  } catch (e: any) {
    return NextResponse.json(
      { signedUrl: null, error: e?.message || 'Failed to get signed URL' },
      { status: 500 }
    )
  }
}
