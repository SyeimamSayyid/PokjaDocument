import { NextRequest, NextResponse } from 'next/server';
const URL_GS = process.env.APPS_SCRIPT_WEBAPP_URL!;

export async function POST(req: NextRequest) {
  try {
    const { fotoFolderId } = await req.json();
    if (!fotoFolderId) return NextResponse.json({ files: [], terpakai: 0 });
    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listFoto', fotoFolderId }), redirect: 'follow',
    });
    const d = await res.json();
    return NextResponse.json({ files: d.files || [], terpakai: d.terpakai || 0, maksimal: d.maksimal });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}