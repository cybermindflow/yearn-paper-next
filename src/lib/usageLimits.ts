import { supabaseAdmin } from './supabase'

// ── Feature flag ──────────────────────────────────────────────────────────────
export const USAGE_LIMITS_ENABLED = process.env.ENABLE_USAGE_LIMITS !== 'false'
export const FREE_USAGE_LIMIT = parseInt(process.env.FREE_USAGE_LIMIT || '999', 10)

export async function checkUsageLimit(parentId: string): Promise<{
  allowed: boolean
  used: number
  limit: number
}> {
  if (!USAGE_LIMITS_ENABLED) {
    return { allowed: true, used: 0, limit: FREE_USAGE_LIMIT }
  }

  const { count } = await supabaseAdmin
    .from('papers')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', parentId)

  const used = count ?? 0
  return {
    allowed: used < FREE_USAGE_LIMIT,
    used,
    limit: FREE_USAGE_LIMIT,
  }
}
