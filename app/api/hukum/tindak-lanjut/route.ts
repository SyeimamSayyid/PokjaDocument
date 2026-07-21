import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const SHEET = 'Tindak Lanjut Pendampingan';

// Kolom (0-based, 5 kolom)
const C = { ID: 0, ID_PENDAMPINGAN: 1, ISI: 2, OLEH: 3, TGL: 4 };

interface TindakLanjutItem { id: string; idPendampingan: string; isi: string; oleh: string; tgl: string; }

// ── GET: daftar tindak lanjut buat 1 pendampingan tertentu ──
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin', 'pegawai_bnn']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idPendampingan = searchParams.get('idPendampingan');
    if (!idPendampingan) {
      return NextResponse.json({ message: 'Parameter idPendampingan wajib diisi.' }, { status: 400 });
    }

    const rows = await getSheetData(SHEET);
    const data: TindakLanjutItem[] = rows
      .filter(r => r[C.ID] && String(r[C.ID_PENDAMPINGAN]).trim() === idPendampingan.trim())
      .map(r => ({
        id: String(r[C.ID] || ''),
        idPendampingan: String(r[C.ID_PENDAMPINGAN] || ''),
        isi: String(r[C.ISI] || ''),
        oleh: String(r[C.OLEH] || ''),
        tgl: String(r[C.TGL] || ''),
      }))
      .sort((a, b) => new Date(a.tgl).getTime() - new Date(b.tgl).getTime());

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: admin tambah catatan tindak lanjut baru ──
export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { idPendampingan, isi, oleh } = await req.json();
    if (!idPendampingan?.trim()) return NextResponse.json({ message: 'ID pendampingan wajib diisi.' }, { status: 400 });
    if (!isi?.trim()) return NextResponse.json({ message: 'Isi tindak lanjut wajib diisi.' }, { status: 400 });

    const id = generateId('TDL');
    const now = formatTanggalWaktu(new Date());
    await appendRow(SHEET, [id, idPendampingan.trim(), isi.trim(), oleh || 'Admin', now]);

    return NextResponse.json({
      message: 'Tindak lanjut berhasil dicatat.',
      data: { id, idPendampingan: idPendampingan.trim(), isi: isi.trim(), oleh: oleh || 'Admin', tgl: now },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}