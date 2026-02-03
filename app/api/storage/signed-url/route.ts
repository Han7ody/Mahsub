import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === 'true'

// Simple in-memory cache for membership checks (cleared on server restart)
const membershipCache = new Map<string, { valid: boolean; expiresAt: number }>();
const MEMBERSHIP_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Cleanup expired membership cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of membershipCache.entries()) {
    if (value.expiresAt < now) {
      membershipCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  // Return demo URL if backend is disabled
  if (!USE_BACKEND) {
    return NextResponse.json({
      signedUrl: '/placeholder-receipt.jpg',
      error: null
    })
  }

  try {
    // Parse body first (fast, no network)
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { error: 'Empty request body' },
          { status: 400 }
        )
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { bucket, path, expiresIn = 3600, download = false } = body

    // Check if this is a batch request
    if (body.paths && Array.isArray(body.paths)) {
      return handleBatchRequest(body);
    }

    // Validate input early (before any DB calls)
    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Missing bucket or path' },
        { status: 400 }
      )
    }

    if (!['receipts', 'avatars'].includes(bucket)) {
      return NextResponse.json(
        { error: 'Invalid bucket name' },
        { status: 400 }
      )
    }

    const pathParts = path.split('/')
    const businessId = pathParts[0]

    if (!businessId) {
      console.error('Invalid path format:', path)
      return NextResponse.json(
        { error: 'Invalid path format' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Signed URL request - BusinessId:', businessId, 'UserId:', user.id, 'Path:', path);

    // Check membership with cache
    const cacheKey = `${user.id}:${businessId}`;
    const cached = membershipCache.get(cacheKey);

    if (!cached || cached.expiresAt < Date.now()) {
      // Cache miss or expired - check database
      // First check if user is the owner of the business
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('owner_user_id', user.id)
        .maybeSingle()

      if (!businessError && business) {
        // User is owner, grant access
        membershipCache.set(cacheKey, {
          valid: true,
          expiresAt: Date.now() + MEMBERSHIP_CACHE_TTL,
        });
      } else {
        // Not owner, check membership
        const { data: membership, error: membershipError } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('business_id', businessId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        const isValid = !membershipError && !!membership;

        // Cache the result with TTL
        membershipCache.set(cacheKey, {
          valid: isValid,
          expiresAt: Date.now() + MEMBERSHIP_CACHE_TTL,
        });

        if (!isValid) {
          console.error('Membership check failed - Membership:', membership, 'CacheKey:', cacheKey);
          return NextResponse.json(
            { error: 'Access denied to this business' },
            { status: 403 }
          )
        }
      }
    } else if (!cached.valid) {
      return NextResponse.json(
        { error: 'Access denied to this business' },
        { status: 403 }
      )
    }

    // Generate signed URL
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn, {
        download: download
      })

    if (error) {
      console.error('Failed to create signed URL:', error)
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      error: null
    })

  } catch (error) {
    console.error('Signed URL API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


// Handle batch requests for multiple signed URLs in one call
async function handleBatchRequest(body: { bucket: string; paths: string[]; expiresIn?: number }) {
  const { bucket, paths, expiresIn = 3600 } = body;

  if (!bucket || !paths || paths.length === 0) {
    return NextResponse.json(
      { error: 'Missing bucket or paths' },
      { status: 400 }
    )
  }

  if (!['receipts', 'avatars'].includes(bucket)) {
    return NextResponse.json(
      { error: 'Invalid bucket name' },
      { status: 400 }
    )
  }

  // Limit batch size
  if (paths.length > 50) {
    return NextResponse.json(
      { error: 'Too many paths (max 50)' },
      { status: 400 }
    )
  }

  const supabase = await createSupabaseServerClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get unique business IDs from paths
  const businessIds = [...new Set(paths.map(p => p.split('/')[0]).filter(Boolean))];

  // Check membership for all business IDs
  for (const businessId of businessIds) {
    const cacheKey = `${user.id}:${businessId}`;
    const cached = membershipCache.get(cacheKey);

    if (!cached || cached.expiresAt < Date.now()) {
      // First check if user is the owner
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('owner_user_id', user.id)
        .maybeSingle()

      if (!businessError && business) {
        membershipCache.set(cacheKey, {
          valid: true,
          expiresAt: Date.now() + 5 * 60 * 1000
        });
      } else {
        const { data: membership, error: membershipError } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('business_id', businessId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        const isValid = !membershipError && !!membership;

        membershipCache.set(cacheKey, {
          valid: isValid,
          expiresAt: Date.now() + 5 * 60 * 1000
        });

        if (!isValid) {
          return NextResponse.json(
            { error: 'Access denied to business' },
            { status: 403 }
          )
        }
      }
    } else if (!cached.valid) {
      return NextResponse.json(
        { error: 'Access denied to business' },
        { status: 403 }
      )
    }
  }

  // Generate all signed URLs in one Supabase call
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn)

  if (error) {
    console.error('Failed to create signed URLs:', error)
    return NextResponse.json(
      { error: 'Failed to generate signed URLs' },
      { status: 500 }
    )
  }

  // Map results to path -> url
  const signedUrls: Record<string, string> = {};
  data?.forEach((item, index) => {
    if (item.signedUrl) {
      signedUrls[paths[index]] = item.signedUrl;
    }
  });

  return NextResponse.json({
    signedUrls,
    error: null
  })
}
