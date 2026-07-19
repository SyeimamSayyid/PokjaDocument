import { NextRequest, NextResponse } from 'next/server';
import { appendRow, getSheetData } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

// Sheet "Komentar Revisi" (0-based) — 8 kolom
// 0 ID Komentar
// 1 ID Dokumen
// 2 Pengirim     (admin / mitra — peran)
// 3 ID Pengirim  (identitas unik: id/email admin, atau 'mitra')
// 4 Nama Pengirim
// 5 Pesan
// 6 Tgl Dibuat
// 7 Dibaca (Ya / '')
const K = { ID: 0, DOK: 1, ROLE: 2, SENDER: 3, NAMA: 4, PESAN: 5, TGL: 6, DIBACA: 7 };
const SHEET = 'Komentar Revisi';

// Resolve label tampilan mitra dari dokumen → (ID Mitra ATAU Nama Institusi) → Pengajuan Mitra.
// Format:
//   MOU → "Nama PIC (Nama Institusi)"
//   PKS → "Nama PIC (Jurusan · Nama Institusi)"  (jurusan diabaikan jika kosong)
// Fallback jika PIC tidak ditemukan sama sekali → nama institusi saja.
async function resolveLabelMitra(idDokumen: string): Promise<string> {
  try {
    const dok = await getSheetData('Dokumen Kerja sama');
    const drow = dok.find(r => String(r[0] || '').trim() === idDokumen);
    if (!drow) return 'Mitra';

    const jenisDok    = String(drow[1] || '').trim();  // MOU / PKS
    const idMitra     = String(drow[3] || '').trim();  // kol 3 = ID Mitra
    const namaInstansi = String(drow[4] || '').trim();  // kol 4 = Nama Mitra

    const pj = await getSheetData('Pengajuan Mitra');

    // 1) Coba match by ID Mitra (paling akurat)
    let matchRows = idMitra
      ? pj.filter(r => String(r[1] || '').trim() === idMitra)
      : [];

    // 2) Fallback: match by nama institusi (case-insensitive) jika ID Mitra kosong/tidak cocok
    if (matchRows.length === 0 && namaInstansi) {
      matchRows = pj.filter(r =>
        String(r[2] || '').trim().toLowerCase() === namaInstansi.toLowerCase()
      );
    }

    if (matchRows.length === 0) return namaInstansi || 'Mitra';

    // ambil baris terakhir yang punya Nama PIC terisi (data terbaru)
    let pic = '', jurusan = '';
    for (const r of matchRows) {
      const p = String(r[18] || '').trim(); // kol 18 = Nama PIC
      if (p) {
        pic = p;
        jurusan = String(r[13] || '').trim(); // kol 13 = Jurusan
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

    let rows: string[][] = [];
    try {
      rows = await getSheetData(SHEET);
    } catch {
      return NextResponse.json({ data: [] }); // sheet belum ada → kosong
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
    if (!['admin', 'mitra', 'bnn_utama'].includes(pengirim)) {
      return NextResponse.json({ message: 'Pengirim tidak valid.' }, { status: 400 });
    }
    // Komentar "resmi BNN Utama" cuma boleh dikirim kalau sesinya beneran
    // level 'utama' — cegah admin BNNP/BNNK mengaku-ngaku jadi BNN Utama
    // lewat body request.
    if (pengirim === 'bnn_utama') {
      const session = await requireSession(req);
      const s = session as Record<string, unknown> | null;
      if (!session || String(s?.level || '') !== 'utama') {
        return NextResponse.json({ message: 'Cuma Admin BNN Utama yang bisa mengirim komentar resmi.' }, { status: 403 });
      }
    }
    if (!pesan) {
      return NextResponse.json({ message: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }
    if (pesan.length > 2000) {
      return NextResponse.json({ message: 'Pesan terlalu panjang (maks 2000 karakter).' }, { status: 400 });
    }

    // Nama tampilan:
    // - mitra → selalu resolve label (PIC + institusi/jurusan) dari server, agar konsisten
    // - admin → pakai nama yang dikirim (mendukung banyak admin)
    let nama: string;
    let idPengirim: string;
    if (pengirim === 'mitra') {
      nama = await resolveLabelMitra(idDokumen);
      idPengirim = 'mitra'; // satu pihak mitra per dokumen
    } else {
      nama = namaPengirim || (pengirim === 'bnn_utama' ? 'Admin BNN Utama' : 'Admin Pokja');
      idPengirim = senderId || nama; // bedakan antar-admin; fallback ke nama
    }

    const now = new Date();
    const id  = generateId('KMT');

    // index 0–7 sesuai struktur sheet
    await appendRow(SHEET, [
      id,                      // 0 ID Komentar
      idDokumen,               // 1 ID Dokumen
      pengirim,                // 2 Pengirim (role)
      idPengirim,              // 3 ID Pengirim
      nama,                    // 4 Nama Pengirim
      pesan,                   // 5 Pesan
      formatTanggalWaktu(now), // 6 Tgl Dibuat
      '',                      // 7 Dibaca
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