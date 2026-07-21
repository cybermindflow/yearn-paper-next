import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SETUP_SECRET = process.env.SETUP_SECRET || 'yearn-setup-2026'

// bcrypt hash of 'yearn2026' (pre-computed, rounds=10)
const DEMO_PASSWORD_HASH = '$2b$10$ktwD9rwZ.bdRtNbOltmLQ.08cUXkxaM5ZCPHu1awmoQHy0HSLc6EC'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      error: 'Missing Supabase credentials',
      supabase_url: supabaseUrl ? 'SET' : 'NOT_SET',
      service_key: supabaseServiceKey ? 'SET' : 'NOT_SET',
    }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const results: string[] = []

  // Check if demo account exists
  const { data: existing, error: checkError } = await supabase
    .from('parents')
    .select('id, phone, nickname')
    .eq('phone', '51111111')
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    results.push(`❌ Check error: ${checkError.message}`)
  }

  if (existing) {
    results.push(`✅ Demo account already exists: ${existing.phone} (${existing.nickname})`)

    // Update password hash to ensure it's correct
    const { error: updateError } = await supabase
      .from('parents')
      .update({ password_hash: DEMO_PASSWORD_HASH })
      .eq('phone', '51111111')

    if (updateError) {
      results.push(`❌ Update password failed: ${updateError.message}`)
    } else {
      results.push(`✅ Password hash updated`)
    }
  } else {
    // Insert demo account
    const { data: inserted, error: insertError } = await supabase
      .from('parents')
      .insert({
        phone: '51111111',
        nickname: '陳太（示範）',
        password_hash: DEMO_PASSWORD_HASH,
      })
      .select()
      .single()

    if (insertError) {
      results.push(`❌ Insert failed: ${insertError.message}`)
    } else {
      results.push(`✅ Demo account created: ${inserted?.phone}`)
    }
  }

  // Verify login works
  const { data: verify, error: verifyError } = await supabase
    .from('parents')
    .select('id, phone, nickname, password_hash')
    .eq('phone', '51111111')
    .single()

  if (verifyError) {
    results.push(`❌ Verify failed: ${verifyError.message}`)
  } else {
    results.push(`✅ Verified: phone=${verify?.phone}, nickname=${verify?.nickname}`)
    results.push(`   hash_prefix: ${verify?.password_hash?.substring(0, 20)}...`)
  }

  return NextResponse.json({
    success: true,
    results,
    supabase_url: supabaseUrl.substring(0, 30) + '...',
  })
}
