import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateCell, findRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const SHEET = 'Chatbot FAQ';

// Kolom (0-based)
const C = {
  ID: 0, PERTANYAAN: 1, JAWABAN: 2, ID_LANJUTAN: 3, TAMPIL_AWAL: 4,
  AKTIF: 5, DIBUAT_OLEH: 6, TGL_DIBUAT: 7, URUTAN: 8,
  LINK_AKSI: 9, LABEL_AKSI: 10, // BARU — tombol opsional di bawah jawaban, mis. "Cek Status" -> /cek-pengajuan
};

interface FaqItem {
  id: string; pertanyaan: string; jawaban: string; idLanjutan: string[];
  tampilAwal: boolean; aktif: boolean; urutan: number;
  linkAksi?: string; labelAksi?: string;
}

function mapRow(r: string[]): FaqItem {
  return {
    id: String(r[C.ID] || ''),
    pertanyaan: String(r[C.PERTANYAAN] || ''),
    jawaban: String(r[C.JAWABAN] || ''),
    idLanjutan: String(r[C.ID_LANJUTAN] || '').split(',').map(s => s.trim()).filter(Boolean),
    tampilAwal: String(r[C.TAMPIL_AWAL] || '').trim().toLowerCase() === 'ya',
    aktif: String(r[C.AKTIF] || 'ya').trim().toLowerCase() !== 'tidak', // default aktif kalau kosong
    urutan: parseInt(String(r[C.URUTAN] || '0')) || 0,
    linkAksi: String(r[C.LINK_AKSI] || '').trim() || undefined,
    labelAksi: String(r[C.LABEL_AKSI] || '').trim() || undefined,
  };
}

// ── GET: publik (chatbot baca semua FAQ aktif) ATAU admin (baca semua termasuk nonaktif, pakai ?semua=1) ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const semua = searchParams.get('semua') === '1';

    if (semua) {
      const session = await requireSession(req, ['admin', 'superadmin']);
      if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
    }

    const rows = await getSheetData(SHEET);
    let data = rows.filter(r => r[C.ID]).map(mapRow);
    if (!semua) data = data.filter(f => f.aktif);
    data.sort((a, b) => a.urutan - b.urutan);

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: admin tambah FAQ baru ──
export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  try {
    const { pertanyaan, jawaban, idLanjutan, tampilAwal, urutan, linkAksi, labelAksi } = await req.json();
    if (!pertanyaan?.trim()) return NextResponse.json({ message: 'Pertanyaan wajib diisi.' }, { status: 400 });
    if (!jawaban?.trim()) return NextResponse.json({ message: 'Jawaban wajib diisi.' }, { status: 400 });

    const s = session as Record<string, unknown>;
    const namaAdmin = String(s.email || s.username || s.nama || 'Admin');

    const id = generateId('FAQ');
    const idLanjutanStr = Array.isArray(idLanjutan) ? idLanjutan.join(',') : '';
    await appendRow(SHEET, [
      id, pertanyaan.trim(), jawaban.trim(), idLanjutanStr,
      tampilAwal ? 'Ya' : 'Tidak', 'Ya', namaAdmin, formatTanggalWaktu(new Date()),
      String(urutan ?? 0),
      String(linkAksi || '').trim(), String(labelAksi || '').trim(),
    ]);

    return NextResponse.json({ id, message: 'FAQ berhasil ditambahkan.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: admin edit FAQ (termasuk aktifkan/nonaktifkan) ──
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  try {
    const { id, fields } = await req.json();
    if (!id || !fields) return NextResponse.json({ message: 'ID dan fields wajib diisi.' }, { status: 400 });

    const found = await findRow(SHEET, C.ID, id);
    if (!found) return NextResponse.json({ message: 'FAQ tidak ditemukan.' }, { status: 404 });

    const map: Record<string, number> = {
      pertanyaan: C.PERTANYAAN + 1,
      jawaban: C.JAWABAN + 1,
      tampilAwal: C.TAMPIL_AWAL + 1,
      aktif: C.AKTIF + 1,
      urutan: C.URUTAN + 1,
      linkAksi: C.LINK_AKSI + 1,
      labelAksi: C.LABEL_AKSI + 1,
    };

    for (const [key, val] of Object.entries(fields)) {
      if (key === 'idLanjutan') {
        const str = Array.isArray(val) ? (val as string[]).join(',') : '';
        await updateCell(SHEET, found.rowNumber, C.ID_LANJUTAN + 1, str);
        continue;
      }
      const col = map[key];
      if (!col) continue;
      let v = val as string | boolean;
      if (typeof v === 'boolean') v = v ? 'Ya' : 'Tidak';
      await updateCell(SHEET, found.rowNumber, col, String(v));
    }

    return NextResponse.json({ message: 'FAQ berhasil diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: admin hapus FAQ ──
export async function DELETE(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });

    // Nonaktifkan saja (soft-delete) — biar ID Lanjutan yang mengacu ke FAQ
    // ini di entri lain tidak jadi rusak/nyasar. Bisa dihapus manual dari
    // sheet kalau memang ingin dibersihkan permanen.
    const found = await findRow(SHEET, C.ID, id);
    if (!found) return NextResponse.json({ message: 'FAQ tidak ditemukan.' }, { status: 404 });
    await updateCell(SHEET, found.rowNumber, C.AKTIF + 1, 'Tidak');

    return NextResponse.json({ message: 'FAQ dinonaktifkan.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}