// @ts-nocheck
/**
 * Onboarding API Route
 * Creates business and owner membership for new users
 * Idempotent - safe to call multiple times
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a business
    const { data: existingMemberships } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', user.id)
      .limit(1)

    if (existingMemberships && existingMemberships.length > 0) {
      // User already has business, return it
      const { data: business } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', existingMemberships[0].business_id)
        .single()

      return NextResponse.json({
        success: true,
        business,
        alreadyExists: true,
      })
    }

    // Get business name from request or use default
    const body = await request.json()
    const businessName = (body.businessName || 'متجري').trim()

    // Validate business name
    if (!businessName || businessName.length < 2) {
      return NextResponse.json(
        { error: 'Business name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    if (businessName.length > 100) {
      return NextResponse.json(
        { error: 'Business name must be less than 100 characters' },
        { status: 400 }
      )
    }

    // Create new business
    const { data: newBusiness, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        owner_user_id: user.id,
      })
      .select()
      .single()

    if (businessError) {
      console.error('Error creating business:', businessError)
      return NextResponse.json(
        { error: 'Failed to create business', details: businessError.message },
        { status: 500 }
      )
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from('business_members')
      .insert({
        business_id: newBusiness.id,
        user_id: user.id,
        role: 'owner',
        permissions: {
          customers_manage: true,
          suppliers_manage: true,
          transactions_manage: true,
          transactions_delete: true,
          workers_manage: true,
        },
        is_active: true,
      })

    if (memberError) {
      console.error('Error creating membership:', memberError)
      // Try to clean up the business
      await supabase.from('businesses').delete().eq('id', newBusiness.id)
      
      return NextResponse.json(
        { error: 'Failed to create membership', details: memberError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      business: {
        id: newBusiness.id,
        name: newBusiness.name,
      },
      alreadyExists: false,
    })
  } catch (error: any) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
