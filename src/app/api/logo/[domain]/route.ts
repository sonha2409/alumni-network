import { NextRequest, NextResponse } from 'next/server'

const DOMAIN_REGEX = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params

  if (!DOMAIN_REGEX.test(domain)) {
    return new NextResponse(null, { status: 400 })
  }

  const apiKey = process.env.LOGO_DEV_API_KEY
  if (!apiKey) {
    console.error('[API:logo] LOGO_DEV_API_KEY is not set')
    return new NextResponse(null, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://img.logo.dev/${domain}?token=${apiKey}&size=64`,
      { next: { revalidate: 604800 } } // 7-day fetch cache
    )

    if (!response.ok) {
      return new NextResponse(null, { status: 404 })
    }

    const contentType = response.headers.get('content-type') ?? 'image/png'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('[API:logo]', { domain, error: (err as Error).message })
    return new NextResponse(null, { status: 404 })
  }
}
