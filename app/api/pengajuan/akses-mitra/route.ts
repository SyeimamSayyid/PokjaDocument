import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell } from '@/lib/sheet';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Kolom Pengajuan Mitra (0-based) yang relevan di sini.
// PENTING: index 19 SUDAH DIPAKAI di /api/pengajuan/status untuk
// "Tanggal Keputusan" — jangan pakai ulang, makanya digeser ke 20/21.
const PJ = {
  ID: 0, NAMA: 2, JENIS: 3, EMAIL: 7, STATUS: 9,
  DIACC_OLEH: 20, EMAIL_TERKIRIM: 21,
};

// Kolom Dokumen Kerja sama (0-based) yang relevan di sini
const DOK = {
  ID: 0, JENIS: 1, JUDUL: 2, NAMA_MITRA: 4, STATUS: 9, KODE: 10, KODE_EXP: 11,
};

function normNama(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Cari dokumen yang match dengan pengajuan ini — dicocokkan lewat nama
// institusi (+ jenis, biar tidak ketuker kalau institusi yang sama punya
// beberapa dokumen MOU dan PKS sekaligus).
async function cariDokumenTerkait(namaInstitusi: string, jenis: string) {
  const rows = await getSheetData('Dokumen Kerja sama');
  const target = normNama(namaInstitusi);
  const matches = rows.filter(r =>
    r[DOK.ID] && normNama(String(r[DOK.NAMA_MITRA])) === target && String(r[DOK.JENIS]).toUpperCase() === jenis.toUpperCase()
  );
  // Kalau lebih dari satu, ambil yang paling baru dibuat (baris terakhir)
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

// GET — cek status: apakah pengajuan ini sudah ada dokumennya, dan apakah
// email kode akses sudah pernah dikirim.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id wajib diisi.' }, { status: 400 });

  try {
    const pjRows = await getSheetData('Pengajuan Mitra');
    const pjRow = pjRows.find(r => String(r[PJ.ID]).trim() === id.trim());
    if (!pjRow) return NextResponse.json({ message: 'Pengajuan tidak ditemukan.' }, { status: 404 });

    const dok = await cariDokumenTerkait(String(pjRow[PJ.NAMA]), String(pjRow[PJ.JENIS]));

    return NextResponse.json({
      diaccOleh: String(pjRow[PJ.DIACC_OLEH] || ''),
      emailTerkirim: String(pjRow[PJ.EMAIL_TERKIRIM] || '').trim().toLowerCase() === 'ya',
      adaDokumen: !!dok,
      idDokumen: dok ? String(dok[DOK.ID]) : '',
      kodeAkses: dok ? String(dok[DOK.KODE]) : '',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, aksi, diaccOleh } = await req.json();
    if (!id) return NextResponse.json({ message: 'id wajib diisi.' }, { status: 400 });

    const pjRows = await getSheetData('Pengajuan Mitra');
    const idx = pjRows.findIndex(r => String(r[PJ.ID]).trim() === id.trim());
    if (idx === -1) return NextResponse.json({ message: 'Pengajuan tidak ditemukan.' }, { status: 404 });
    const pjRow = pjRows[idx];
    const rowNumber = idx + 2;

    // ── Aksi 1: catat siapa yang meng-ACC (dipanggil sesaat setelah
    // status pengajuan berhasil diubah jadi "Disetujui" oleh route lain) ──
    if (aksi === 'catatDiacc') {
      if (!diaccOleh) return NextResponse.json({ message: 'diaccOleh wajib diisi.' }, { status: 400 });
      await updateCell('Pengajuan Mitra', rowNumber, PJ.DIACC_OLEH + 1, String(diaccOleh));
      return NextResponse.json({ message: 'Dicatat.' });
    }

    // ── Aksi 2: kirim (ulang) email kode akses ke mitra ──
    if (aksi === 'kirimUlangAkses') {
      const email = String(pjRow[PJ.EMAIL] || '').trim();
      if (!email) return NextResponse.json({ message: 'Pengajuan ini tidak punya alamat email mitra.' }, { status: 400 });

      const namaInstitusi = String(pjRow[PJ.NAMA]);
      const jenis = String(pjRow[PJ.JENIS]);
      const dok = await cariDokumenTerkait(namaInstitusi, jenis);
      if (!dok) return NextResponse.json({ message: 'Dokumen terkait belum ditemukan — pastikan sudah di-Acc & Generate Kode dulu.' }, { status: 404 });

      const kodeAkses  = String(dok[DOK.KODE] || '');
      const kodeExpire = String(dok[DOK.KODE_EXP] || '');
      const judul      = String(dok[DOK.JUDUL] || '');
      const idDokumen  = String(dok[DOK.ID] || '');
      if (!kodeAkses) return NextResponse.json({ message: 'Dokumen ditemukan tapi belum punya kode akses.' }, { status: 400 });

      const r = await fetch(APPS_SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kirimEmailAkses', email, namaMitra: namaInstitusi, jenis, judul,
          kodeAkses, kodeExpire, idDokumen,
        }),
        redirect: 'follow',
      });
      const d = await r.json();
      if (!d.success) return NextResponse.json({ message: d.error || 'Gagal mengirim email.' }, { status: 400 });

      await updateCell('Pengajuan Mitra', rowNumber, PJ.EMAIL_TERKIRIM + 1, 'Ya');
      return NextResponse.json({ message: `Kode akses berhasil dikirim ke ${email}.` });
    }

    return NextResponse.json({ message: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}