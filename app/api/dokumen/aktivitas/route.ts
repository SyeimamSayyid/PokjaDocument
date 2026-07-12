import { NextRequest, NextResponse } from 'next/server';
import { findRow, updateCell } from '@/lib/sheet';
import { formatTanggalWaktu } from '@/lib/utils';
import { getLastActivity } from '@/lib/gdocs';
import { requireSession } from '@/lib/auth';

const COL_ID = 0;
const COL_TERAKHIR_DIAKSES = 17;
const COL_DOCS_ID = 12;

// Admin/superadmin bebas; mitra HANYA boleh catat/lihat aktivitas dokumennya sendiri.
async function checkAkses(req: NextRequest, idDokumen: string) {
  const session = await requireSession(req);
  if (!session) return null;
  if (['admin', 'superadmin'].includes(String(session.role))) return session;
  if (session.role === 'mitra' && String(session.idDokumen) === idDokumen) return session;
  return null;
}

// ── POST: Catat siapa yang membuka/mengedit dokumen ────────
export async function POST(req: NextRequest) {
  try {
    const { idDokumen, aktor, peran } = await req.json();

    if (!idDokumen || !aktor || !peran) {
      return NextResponse.json({ message: 'idDokumen, aktor, dan peran wajib diisi.' }, { status: 400 });
    }

    const session = await checkAkses(req, idDokumen);
    if (!session) {
      return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
    }

    const found = await findRow('Dokumen Kerja sama', COL_ID, idDokumen);
    if (!found) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    const now = new Date();
    const label = peran === 'mitra' ? `Mitra (${aktor})` : `Admin (${aktor})`;
    const catatan = `${formatTanggalWaktu(now)} oleh ${label}`;

    await updateCell('Dokumen Kerja sama', found.rowNumber, COL_TERAKHIR_DIAKSES + 1, catatan);

    return NextResponse.json({ message: 'Aktivitas tercatat.', catatan });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: Ambil info "terakhir diedit" — gabungan manual log + Drive Activity ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('idDokumen');

    if (!idDokumen) {
      return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });
    }

    const session = await checkAkses(req, idDokumen);
    if (!session) {
      return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
    }

    const found = await findRow('Dokumen Kerja sama', COL_ID, idDokumen);
    if (!found) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    const manualLog = String(found.data[COL_TERAKHIR_DIAKSES] || '');
    const docsId = String(found.data[COL_DOCS_ID] || '');

    let driveActivity = null;
    if (docsId) {
      driveActivity = await getLastActivity(docsId);
    }

    return NextResponse.json({
      manualLog: manualLog || 'Belum ada aktivitas tercatat.',
      driveActivity,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}