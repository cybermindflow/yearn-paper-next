import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT_SET'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT_SET'

  // Mask keys for security
  const maskKey = (k: string) => k === 'NOT_SET' ? 'NOT_SET' : k.substring(0, 20) + '...'

  try {
    // Try to query parents table
    const { data, error, count } = await supabaseAdmin
      .from('parents')
      .select('phone, nickname', { count: 'exact' })
      .limit(5)

    return NextResponse.json({
      supabase_url: url,
      service_key_prefix: maskKey(serviceKey),
      anon_key_prefix: maskKey(anonKey),
      query_result: { data, error: error?.message, count }
    })
  } catch (e) {
    return NextResponse.json({
      supabase_url: url,
      service_key_prefix: maskKey(serviceKey),
      anon_key_prefix: maskKey(anonKey),
      exception: String(e)
    })
  }
}
