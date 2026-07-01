import { NextRequest, NextResponse } from 'next/server';
const URL_GS = process.env.APPS_SCRIPT_WEBAPP_URL!;

export async function POST(req: NextRequest) {
  try {
    const { fileId, fotoFolderId } = await req.json();
    if (!fileId || !fotoFolderId) {
      return NextResponse.json({ message: 'fileId & fotoFolderId wajib.' }, { status: 400 });
    }
    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hapusFoto', fileId, fotoFolderId, olehAdmin: false }),
      redirect: 'follow',
    });
    const d = await res.json();
    return NextResponse.json(d);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}