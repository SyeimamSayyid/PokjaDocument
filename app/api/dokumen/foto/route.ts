import { NextRequest, NextResponse } from 'next/server';
import { findRow } from '@/lib/sheet';
import { uploadFotoKegiatan, listFotoKegiatan, hapusFotoKegiatan } from '@/lib/gdocs';

// Kolom "Dokumen Kerja sama" — Folder Foto disimpan di kolom baru (lihat catatan di bawah)
const COL_ID = 0;
const COL_FOTO_FOLDER = 18; // kolom S (0-based 18): Q=Terakhir Diakses(16), R=Akses Oleh(17), S=Folder Foto ID(18)

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function getFotoFolderId(idDokumen: string): Promise<string | null> {
  const found = await findRow('Dokumen Kerja sama', COL_ID, idDokumen);
  if (!found) return null;
  const folderId = String(found.data[COL_FOTO_FOLDER] || '').trim();
  return folderId || null;
}

// ── GET: List foto + status kuota ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('idDokumen');

    if (!idDokumen) {
      return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });
    }

    const fotoFolderId = await getFotoFolderId(idDokumen);
    if (!fotoFolderId) {
      return NextResponse.json({ message: 'Folder foto tidak ditemukan untuk dokumen ini.' }, { status: 404 });
    }

    const result = await listFotoKegiatan(fotoFolderId);
    return NextResponse.json({ ...result, fotoFolderId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: Upload foto baru ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idDokumen, namaFile, base64Data, mimeType } = body;

    if (!idDokumen || !namaFile || !base64Data) {
      return NextResponse.json({ message: 'idDokumen, namaFile, dan base64Data wajib diisi.' }, { status: 400 });
    }

    // Validasi tipe file
    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (mimeType && !allowedMime.includes(mimeType)) {
      return NextResponse.json({ message: 'Tipe file harus JPG, PNG, atau WEBP.' }, { status: 400 });
    }

    // Validasi ukuran sebelum kirim ke Apps Script (estimasi cepat)
    const estimasiBytes = Math.ceil(base64Data.length * 0.75);
    if (estimasiBytes > MAX_SIZE) {
      return NextResponse.json({
        message: `File terlalu besar (${(estimasiBytes / 1024 / 1024).toFixed(2)}MB). Maksimal total penyimpanan adalah 5MB.`,
      }, { status: 400 });
    }

    const fotoFolderId = await getFotoFolderId(idDokumen);
    if (!fotoFolderId) {
      return NextResponse.json({ message: 'Folder foto tidak ditemukan untuk dokumen ini.' }, { status: 404 });
    }

    const result = await uploadFotoKegiatan({
      fotoFolderId,
      namaFile,
      base64Data,
      mimeType: mimeType || 'image/jpeg',
    });

    return NextResponse.json({ message: 'Foto berhasil diupload.', ...result });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('KUOTA_PENUH') || msg.includes('Kuota penyimpanan')) {
      return NextResponse.json({ message: msg.replace('Error: ', '') }, { status: 413 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE: Hapus foto ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { idDokumen, fileId } = await req.json();

    if (!idDokumen || !fileId) {
      return NextResponse.json({ message: 'idDokumen dan fileId wajib diisi.' }, { status: 400 });
    }

    const fotoFolderId = await getFotoFolderId(idDokumen);
    if (!fotoFolderId) {
      return NextResponse.json({ message: 'Folder foto tidak ditemukan.' }, { status: 404 });
    }

    const result = await hapusFotoKegiatan({ fileId, fotoFolderId });
    return NextResponse.json({ message: 'Foto berhasil dihapus.', ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}