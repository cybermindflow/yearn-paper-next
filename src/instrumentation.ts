/**
 * Next.js Instrumentation
 * Runs once on server startup to ensure database schema exists.
 * This is safe to run multiple times (all statements use IF NOT EXISTS).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await initializeDatabase()
  }
}

async function initializeDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('[Setup] Skipping DB init: missing credentials')
    return
  }

  try {
    // Check if tables already exist
    const checkResp = await fetch(
      `${supabaseUrl}/rest/v1/parents?limit=1`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        }
      }
    )

    if (checkResp.ok || checkResp.status === 200) {
      console.log('[Setup] Database already initialized, skipping')
      return
    }

    // Tables don't exist - trigger setup
    console.log('[Setup] Database not initialized, running setup...')
    const setupSecret = process.env.SETUP_SECRET || 'yearn-setup-2026'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const setupResp = await fetch(
      `${appUrl}/api/setup?secret=${setupSecret}`,
      { method: 'GET' }
    )
    
    if (setupResp.ok) {
      console.log('[Setup] Database setup completed successfully')
    } else {
      console.warn('[Setup] Database setup returned:', setupResp.status)
    }
  } catch (error) {
    console.warn('[Setup] Database initialization check failed:', error)
  }
}
