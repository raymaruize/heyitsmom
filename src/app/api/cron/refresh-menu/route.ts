import { NextRequest, NextResponse } from 'next/server'

/**
 * Vercel Cron endpoint - called daily at 5:00 AM New York time
 * This triggers menu refresh for today plus next 6 days
 */
export async function POST(request: NextRequest) {
  try {
    // Verify request is from Vercel
    const vercelCronSecret = request.headers.get('authorization')
    if (!vercelCronSecret || vercelCronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call menu refresh endpoint
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/menu`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.MENU_REFRESH_SECRET}`,
        'content-type': 'application/json',
      },
    })

    const data = await response.json()

    return NextResponse.json({
      message: 'Cron job executed',
      menuRefreshResult: data,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    )
  }
}
