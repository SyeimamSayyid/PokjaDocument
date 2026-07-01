import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

const URL_GS = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Kolom "Dokumen Kerja sama" (0-based) — cuma yang dipakai di sini
const DOK_COL = { ID: 0, ID_MITRA: 3, FOTO_FOLDER: 18 };

async function resolveFotoFolderId(idDokumen: string): Promise<string | null> {
  const rows = await getSheetData('Dokumen Kerja sama');
  const row = rows.find(r => String(r[DOK_COL.ID] || '').trim() === idDokumen);
  if (!row) return null;
  const folderId = String(row[DOK_COL.FOTO_FOLDER] || '').trim();
  return folderId || null;
}

// ── GET: daftar foto untuk satu dokumen ────────────────────
// Dipakai halaman /dashboard/mitra — fetch(`/api/dokumen/foto?idDokumen=...`)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('idDokumen')?.trim();
    if (!idDokumen) return NextResponse.json({ files: [], terpakai: 0 });

    const fotoFolderId = await resolveFotoFolderId(idDokumen);
    if (!fotoFolderId) return NextResponse.json({ files: [], terpakai: 0 });

    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listFoto', fotoFolderId }),
      redirect: 'follow',
    });
    const d = await res.json();
    return NextResponse.json({
      files: d.files || [],
      terpakai: d.terpakai || 0,
      maksimal: d.maksimal,
      persenTerpakai: d.persenTerpakai || 0,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: upload foto (+ caption) ──────────────────────────
// Dipakai halaman /dashboard/mitra — kirim idDokumen, TIDAK kirim fotoFolderId
// (fotoFolderId di-resolve otomatis di sini dari idDokumen).
export async function POST(req: NextRequest) {
  try {
    const { idDokumen, namaFile, base64Data, mimeType, caption } = await req.json();
    if (!idDokumen || !base64Data) {
      return NextResponse.json({ message: 'Data foto tidak lengkap.' }, { status: 400 });
    }

    const fotoFolderId = await resolveFotoFolderId(idDokumen);
    if (!fotoFolderId) {
      return NextResponse.json({ message: 'Folder foto untuk dokumen ini tidak ditemukan.' }, { status: 404 });
    }

    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'uploadFoto',
        fotoFolderId,
        idDokumen,
        namaFile,
        base64Data,
        mimeType,
        caption: caption || '',
      }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (d.success === false) {
      return NextResponse.json({ message: d.message || d.error || 'Gagal upload.' }, { status: 400 });
    }
    return NextResponse.json(d);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: hapus foto milik sendiri (mitra) ───────────────
export async function DELETE(req: NextRequest) {
  try {
    const { idDokumen, fileId } = await req.json();
    if (!idDokumen || !fileId) {
      return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
    }

    const fotoFolderId = await resolveFotoFolderId(idDokumen);
    if (!fotoFolderId) {
      return NextResponse.json({ message: 'Folder foto tidak ditemukan.' }, { status: 404 });
    }

    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hapusFoto', fileId, fotoFolderId, idDokumen }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (d.success === false) {
      return NextResponse.json({ message: d.error || 'Gagal hapus.' }, { status: 400 });
    }
    return NextResponse.json(d);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}