import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to dashboard after OAuth consent
  return NextResponse.redirect(new URL('/dashboard/customers', request.url));
}
