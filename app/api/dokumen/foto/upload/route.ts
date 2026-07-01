import { NextRequest, NextResponse } from 'next/server';
const URL_GS = process.env.APPS_SCRIPT_WEBAPP_URL!;

export async function POST(req: NextRequest) {
  try {
    const { fotoFolderId, fileBase64, fileName, fileMime, idDokumen } = await req.json();
    if (!fotoFolderId || !fileBase64) {
      return NextResponse.json({ message: 'Data foto tidak lengkap.' }, { status: 400 });
    }
    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'uploadFoto',
        fotoFolderId,
        idDokumen: idDokumen || '',
        namaFile: fileName,
        base64Data: fileBase64,
        mimeType: fileMime,
      }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (d.success === false) return NextResponse.json({ message: d.message || d.error || 'Gagal upload.' }, { status: 400 });
    return NextResponse.json(d);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}