import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Upload draft dokumen mitra MANDIRI — dipakai sebelum dokumen benar-benar
// di-generate (beda dari /api/dokumen/upload-template yang butuh idDokumen
// yang sudah ada). Reuse action 'uploadDokumenMitra' yang sama dipakai form
// Pengajuan Publik.
export async function POST(req: NextRequest) {
  try {
    const { fileBase64, fileName, fileMime, namaInstitusi, jenis } = await req.json();

    if (!fileBase64 || !fileName || !fileMime) {
      return NextResponse.json({ message: 'Berkas wajib diunggah.' }, { status: 400 });
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'uploadDokumenMitra',
        namaFile: fileName,
        base64Data: fileBase64,
        mimeType: fileMime,
        namaInstitusi: namaInstitusi || 'Tanpa Nama',
        jenis: jenis || '',
      }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (!d.success) {
      return NextResponse.json({ message: d.message || 'Gagal mengunggah berkas.' }, { status: 400 });
    }

    return NextResponse.json({ fileId: d.fileId, fileUrl: d.fileUrl, namaFile: d.namaFile });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}