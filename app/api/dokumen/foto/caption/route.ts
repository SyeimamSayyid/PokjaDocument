import { NextRequest, NextResponse } from 'next/server';
const URL_GS = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Edit caption foto yang sudah diunggah sebelumnya
export async function POST(req: NextRequest) {
  try {
    const { fileId, caption } = await req.json();
    if (!fileId) return NextResponse.json({ message: 'fileId wajib diisi.' }, { status: 400 });

    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateCaptionFoto', fileId, caption: caption || '' }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (d.success === false) return NextResponse.json({ message: d.error || 'Gagal menyimpan caption.' }, { status: 400 });
    return NextResponse.json({ caption: d.caption ?? caption ?? '' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}