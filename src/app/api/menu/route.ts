import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAndParseMenu } from '@/lib/menuScraper'

// Initialize Supabase with service role for menu updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Service role key not configured for menu refresh')
}

/**
 * GET /api/menu?date=YYYY-MM-DD
 * Fetch menu for a given date, using cache if available
 * Public endpoint for reading cached menus
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Use public client for reads
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('cafeteria_menu_cache')
      .select('meal_periods, fetched_at')
      .eq('date', date)
      .eq('location', 'Elm')
      .single()

    if (cached && !cacheError) {
      // Always return cache when available (historical/future date views need stable data)
      return NextResponse.json({
        date,
        location: 'Elm',
        mealPeriods: cached.meal_periods,
        cached: true,
      })
    }

    // Cache miss: fetch on-demand from source
    const parsed = await fetchAndParseMenu(date)

    if (!parsed || !parsed.mealPeriods || parsed.mealPeriods.length === 0) {
      return NextResponse.json(
        {
          error: 'Menu unavailable for this date',
        },
        { status: 404 }
      )
    }

    // Save fetched menu for future reads (best effort)
    if (supabaseServiceKey) {
      try {
        const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
        await serviceSupabase
          .from('cafeteria_menu_cache')
          .upsert({
            date,
            location: 'Elm',
            meal_periods: parsed.mealPeriods,
            fetched_at: new Date().toISOString(),
            source_url: 'https://epicuremenus.com/clients/exeter/online',
            etag_or_hash: new Date().getTime().toString(),
          })
      } catch (writeError) {
        console.warn('Menu cache write failed:', writeError)
      }
    }

    return NextResponse.json({
      date,
      location: 'Elm',
      mealPeriods: parsed.mealPeriods,
      cached: false,
    })
  } catch (error) {
    console.error('Menu GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/menu/refresh
 * Protected endpoint to refresh menu cache
 * Requires MENU_REFRESH_SECRET in Authorization header
 * Called by Vercel Cron or GitHub Actions
 */
export async function POST(request: NextRequest) {
  try {
    // Verify secret token
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.MENU_REFRESH_SECRET

    if (!expectedSecret || !authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service configuration incomplete' },
        { status: 500 }
      )
    }

    // Initialize Supabase with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Refresh today plus next 6 days
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }

    const results = []

    for (const date of dates) {
      try {
        const parsed = await fetchAndParseMenu(date)

        if (parsed) {
          // Update cache
          await supabase
            .from('cafeteria_menu_cache')
            .upsert({
              date,
              location: 'Elm',
              meal_periods: parsed.mealPeriods,
              fetched_at: new Date().toISOString(),
              source_url: 'https://epicuremenus.com/clients/exeter/online',
              etag_or_hash: new Date().getTime().toString(),
            })
            .eq('date', date)
            .eq('location', 'Elm')

          results.push({ date, status: 'success', mealPeriods: parsed.mealPeriods.length })
        } else {
          results.push({ date, status: 'failed', reason: 'Parse error' })
        }
      } catch (error) {
        results.push({ date, status: 'failed', reason: String(error) })
      }
    }

    return NextResponse.json({
      message: 'Menu refresh completed',
      results,
      refreshedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Menu refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh menu' },
      { status: 500 }
    )
  }
}
