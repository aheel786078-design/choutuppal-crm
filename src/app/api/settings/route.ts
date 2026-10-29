import { NextResponse } from 'next/server'
import { loadStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const store = loadStore()
    const tickers = (store.tickers || []).filter((t: any) => t.isActive !== false)

    return NextResponse.json({
      ok: true,
      settings: {
        announcement_ticker: tickers.map((t: any) => t.text).join(' | '),
        ticker_items_json: JSON.stringify(tickers),
        facebook_url: 'https://facebook.com/choutuppal.in',
        instagram_url: 'https://instagram.com/choutuppal.in',
        youtube_url: 'https://youtube.com/@choutuppal',
        whatsapp_number: '9441348175',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
