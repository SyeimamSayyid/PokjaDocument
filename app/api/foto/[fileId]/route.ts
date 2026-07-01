import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Image proxy — server ambil foto dari Drive via Apps Script (base64),
// lalu kirim balik sebagai gambar same-origin → tidak kena CORB.
// ?download=1 → paksa unduh (Content-Disposition attachment)
export async function GET(req: NextRequest, ctx: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await ctx.params;
    if (!fileId) return new NextResponse('fileId wajib', { status: 400 });

    const isDownload = new URL(req.url).searchParams.get('download') === '1';

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getFoto', fileId }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (!d.success || !d.base64) {
      return new NextResponse('Foto tidak ditemukan', { status: 404 });
    }

    const buffer = Buffer.from(d.base64, 'base64');
    const headers: Record<string, string> = {
      'Content-Type': d.mimeType || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    };
    if (isDownload) {
      const safeName = (d.nama || 'foto').replace(/[^\w.\- ]/g, '_');
      headers['Content-Disposition'] = `attachment; filename="${safeName}"`;
    }

    return new NextResponse(buffer, { status: 200, headers });
  } catch (err) {
    return new NextResponse('Error: ' + String(err), { status: 500 });
  }
}