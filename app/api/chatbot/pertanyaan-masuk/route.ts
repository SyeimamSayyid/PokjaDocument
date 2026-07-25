import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateCell, findRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const SHEET = 'Chatbot Pertanyaan Masuk';

const C = {
  ID: 0, PERTANYAAN: 1, STATUS: 2, ID_FAQ_TERKAIT: 3,
  TGL_DIAJUKAN: 4, DIPROSES_OLEH: 5, TGL_DIPROSES: 6, SUMBER_HALAMAN: 7,
};

interface PertanyaanItem {
  id: string; pertanyaan: string; status: string; idFaqTerkait: string;
  tglDiajukan: string; diprosesOleh: string; tglDiproses: string; sumberHalaman: string;
}

function mapRow(r: string[]): PertanyaanItem {
  return {
    id: String(r[C.ID] || ''),
    pertanyaan: String(r[C.PERTANYAAN] || ''),
    status: String(r[C.STATUS] || 'Menunggu'),
    idFaqTerkait: String(r[C.ID_FAQ_TERKAIT] || ''),
    tglDiajukan: String(r[C.TGL_DIAJUKAN] || ''),
    diprosesOleh: String(r[C.DIPROSES_OLEH] || ''),
    tglDiproses: String(r[C.TGL_DIPROSES] || ''),
    sumberHalaman: String(r[C.SUMBER_HALAMAN] || ''),
  };
}

// ── GET: admin lihat semua pertanyaan masuk ──
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  try {
    const rows = await getSheetData(SHEET);
    const data = rows.filter(r => r[C.ID]).map(mapRow)
      .sort((a, b) => new Date(b.tglDiajukan).getTime() - new Date(a.tglDiajukan).getTime());
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: siapa saja (pengguna chatbot, publik) ajukan pertanyaan yang belum terjawab ──
export async function POST(req: NextRequest) {
  try {
    const { pertanyaan, sumberHalaman } = await req.json();
    if (!pertanyaan?.trim()) return NextResponse.json({ message: 'Pertanyaan wajib diisi.' }, { status: 400 });

    const id = generateId('CQ');
    await appendRow(SHEET, [
      id, pertanyaan.trim(), 'Menunggu', '',
      formatTanggalWaktu(new Date()), '', '', sumberHalaman || '',
    ]);

    return NextResponse.json({ message: 'Pertanyaan Anda sudah dikirim ke admin. Terima kasih!' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: admin tandai selesai/abaikan, opsional kaitkan ke FAQ yang dibuat dari pertanyaan ini ──
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  try {
    const { id, status, idFaqTerkait } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });
    if (!['Dijawab', 'Diabaikan'].includes(status)) {
      return NextResponse.json({ message: 'Status tidak dikenali.' }, { status: 400 });
    }

    const found = await findRow(SHEET, C.ID, id);
    if (!found) return NextResponse.json({ message: 'Pertanyaan tidak ditemukan.' }, { status: 404 });

    const s = session as Record<string, unknown>;
    const namaAdmin = String(s.email || s.username || s.nama || 'Admin');

    await updateCell(SHEET, found.rowNumber, C.STATUS + 1, status);
    if (idFaqTerkait) await updateCell(SHEET, found.rowNumber, C.ID_FAQ_TERKAIT + 1, idFaqTerkait);
    await updateCell(SHEET, found.rowNumber, C.DIPROSES_OLEH + 1, namaAdmin);
    await updateCell(SHEET, found.rowNumber, C.TGL_DIPROSES + 1, formatTanggalWaktu(new Date()));

    return NextResponse.json({ message: `Pertanyaan ditandai "${status}".` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}