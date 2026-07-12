import { NextRequest, NextResponse } from 'next/server';
import { appendRow, getSheetData } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const K = { ID: 0, DOK: 1, ROLE: 2, SENDER: 3, NAMA: 4, PESAN: 5, TGL: 6, DIBACA: 7 };
const SHEET = 'Komentar Revisi';

// Admin/superadmin bebas; mitra HANYA boleh akses komentar dokumennya sendiri.
async function checkAkses(req: NextRequest, idDokumen: string) {
  const session = await requireSession(req);
  if (!session) return null;
  if (['admin', 'superadmin'].includes(String(session.role))) return session;
  if (session.role === 'mitra' && String(session.idDokumen) === idDokumen) return session;
  return null;
}

async function resolveLabelMitra(idDokumen: string): Promise<string> {
  try {
    const dok = await getSheetData('Dokumen Kerja sama');
    const drow = dok.find(r => String(r[0] || '').trim() === idDokumen);
    if (!drow) return 'Mitra';

    const jenisDok    = String(drow[1] || '').trim();
    const idMitra     = String(drow[3] || '').trim();
    const namaInstansi = String(drow[4] || '').trim();

    const pj = await getSheetData('Pengajuan Mitra');

    let matchRows = idMitra
      ? pj.filter(r => String(r[1] || '').trim() === idMitra)
      : [];

    if (matchRows.length === 0 && namaInstansi) {
      matchRows = pj.filter(r =>
        String(r[2] || '').trim().toLowerCase() === namaInstansi.toLowerCase()
      );
    }

    if (matchRows.length === 0) return namaInstansi || 'Mitra';

    let pic = '', jurusan = '';
    for (const r of matchRows) {
      const p = String(r[18] || '').trim();
      if (p) {
        pic = p;
        jurusan = String(r[13] || '').trim();
      }
    }

    if (!pic) return namaInstansi || 'Mitra';

    if (jenisDok === 'PKS' && jurusan) {
      return `${pic} (${jurusan} · ${namaInstansi})`;
    }
    return `${pic} (${namaInstansi})`;
  } catch {
    return 'Mitra';
  }
}

// ── GET: daftar komentar untuk satu dokumen ───────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('idDokumen')?.trim();
    if (!idDokumen) {
      return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });
    }

    const session = await checkAkses(req, idDokumen);
    if (!session) {
      return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
    }

    let rows: string[][] = [];
    try {
      rows = await getSheetData(SHEET);
    } catch {
      return NextResponse.json({ data: [] });
    }

    const data = rows
      .filter(r => String(r[K.DOK] || '').trim() === idDokumen)
      .map(r => ({
        id:           String(r[K.ID] || ''),
        idDokumen:    String(r[K.DOK] || ''),
        pengirim:     String(r[K.ROLE] || ''),
        idPengirim:   String(r[K.SENDER] || ''),
        namaPengirim: String(r[K.NAMA] || ''),
        pesan:        String(r[K.PESAN] || ''),
        tglDibuat:    String(r[K.TGL] || ''),
        dibaca:       String(r[K.DIBACA] || '') === 'Ya',
      }));

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: tambah komentar ─────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idDokumen    = String(body.idDokumen || '').trim();
    const pengirim     = String(body.pengirim || '').trim().toLowerCase();
    const senderId     = String(body.senderId || '').trim();
    const namaPengirim = String(body.namaPengirim || '').trim();
    const pesan        = String(body.pesan || '').trim();

    if (!idDokumen) {
      return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });
    }

    const session = await checkAkses(req, idDokumen);
    if (!session) {
      return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
    }

    if (!['admin', 'mitra'].includes(pengirim)) {
      return NextResponse.json({ message: 'Pengirim tidak valid.' }, { status: 400 });
    }
    if (!pesan) {
      return NextResponse.json({ message: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }
    if (pesan.length > 2000) {
      return NextResponse.json({ message: 'Pesan terlalu panjang (maks 2000 karakter).' }, { status: 400 });
    }

    let nama: string;
    let idPengirim: string;
    if (pengirim === 'mitra') {
      nama = await resolveLabelMitra(idDokumen);
      idPengirim = 'mitra';
    } else {
      nama = namaPengirim || 'Admin Pokja';
      idPengirim = senderId || nama;
    }

    const now = new Date();
    const id  = generateId('KMT');

    await appendRow(SHEET, [
      id,
      idDokumen,
      pengirim,
      idPengirim,
      nama,
      pesan,
      formatTanggalWaktu(now),
      '',
    ]);

    return NextResponse.json({
      data: {
        id, idDokumen, pengirim, idPengirim,
        namaPengirim: nama, pesan,
        tglDibuat: formatTanggalWaktu(now), dibaca: false,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}