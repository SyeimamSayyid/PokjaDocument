import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateCell } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const SHEET = 'Masukan Saran';

// Kolom (0-based, 9 kolom — tambah RATING dari struktur lama)
const C = {
  ID: 0, SUMBER: 1, IDENTITAS: 2, KATEGORI: 3, ISI: 4,
  TGL_KIRIM: 5, STATUS_DIBACA: 6, DIBACA_OLEH: 7, RATING: 8,
};

const KATEGORI_VALID = ['Kepuasan Layanan', 'Saran Perbaikan', 'Keluhan', 'Lainnya'];

interface MasukanItem {
  id: string; sumber: string; identitas: string; kategori: string; isi: string;
  tglKirim: string; dibaca: boolean; dibacaOleh: string; rating: number;
}

function mapRow(r: string[]): MasukanItem {
  return {
    id: String(r[C.ID] || ''),
    sumber: String(r[C.SUMBER] || ''),
    identitas: String(r[C.IDENTITAS] || ''),
    kategori: String(r[C.KATEGORI] || ''),
    isi: String(r[C.ISI] || ''),
    tglKirim: String(r[C.TGL_KIRIM] || ''),
    dibaca: String(r[C.STATUS_DIBACA] || '').trim().toLowerCase() === 'ya',
    dibacaOleh: String(r[C.DIBACA_OLEH] || ''),
    rating: parseInt(String(r[C.RATING] || '0')) || 0,
  };
}

// ── GET: admin lihat semua masukan (termasuk ringkasan rata-rata rating) ──
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const rows = await getSheetData(SHEET);
    const data = rows.filter(r => r[C.ID]).map(mapRow)
      .sort((a, b) => new Date(b.tglKirim).getTime() - new Date(a.tglKirim).getTime());

    const denganRating = data.filter(d => d.rating > 0);
    const rataRata = denganRating.length > 0
      ? Math.round((denganRating.reduce((s, d) => s + d.rating, 0) / denganRating.length) * 10) / 10
      : 0;

    return NextResponse.json({
      data,
      ringkasan: { total: data.length, belumDibaca: data.filter(d => !d.dibaca).length, rataRataRating: rataRata, totalRating: denganRating.length },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: mitra kirim saran/kepuasan ──
export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['mitra']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { kategori, isi, rating } = await req.json();
    if (!KATEGORI_VALID.includes(kategori)) {
      return NextResponse.json({ message: 'Kategori tidak valid.' }, { status: 400 });
    }
    if (!isi?.trim()) return NextResponse.json({ message: 'Isi masukan wajib diisi.' }, { status: 400 });
    const ratingNum = parseInt(String(rating || '0'));
    if (ratingNum < 0 || ratingNum > 5) {
      return NextResponse.json({ message: 'Rating harus antara 1-5 (atau kosongkan jika tidak ingin memberi rating).' }, { status: 400 });
    }

    const identitas = String((session as { namaMitra?: string }).namaMitra || 'Mitra');

    const id = generateId('MSK');
    const now = formatTanggalWaktu(new Date());
    await appendRow(SHEET, [id, 'Mitra', identitas, kategori, isi.trim(), now, '', '', String(ratingNum || '')]);

    return NextResponse.json({ message: 'Terima kasih atas masukan Anda! Saran ini sudah tersampaikan ke Pokja Kerja Sama.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: admin tandai sudah dibaca ──
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { id, dibacaOleh } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID masukan wajib diisi.' }, { status: 400 });

    const rows = await getSheetData(SHEET);
    const idx = rows.findIndex(r => String(r[C.ID]).trim() === String(id).trim());
    if (idx === -1) return NextResponse.json({ message: 'Masukan tidak ditemukan.' }, { status: 404 });

    const rowNumber = idx + 2;
    await updateCell(SHEET, rowNumber, C.STATUS_DIBACA + 1, 'Ya');
    await updateCell(SHEET, rowNumber, C.DIBACA_OLEH + 1, dibacaOleh || '');

    return NextResponse.json({ message: 'Ditandai sudah dibaca.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}