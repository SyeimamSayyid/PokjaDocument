import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

// ── ENDPOINT DIAGNOSTIK SEMENTARA — hapus file ini setelah bug Extract
// Poin/Beranda selesai ditelusuri. Tujuannya cuma menampilkan RAW DATA
// satu dokumen dari kedua sheet yang relevan, plus penjelasan kenapa
// item itu lolos/tidak lolos filter di /api/beranda. ──
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('id');
    if (!idDokumen) return NextResponse.json({ message: 'Parameter ?id= wajib diisi.' }, { status: 400 });

    // ── 1. Cari di "Poin Publik Kegiatan" ──
    const pubRows = await getSheetData('Poin Publik Kegiatan');
    const pubIdx = pubRows.findIndex(r => String(r[1] || '').trim() === idDokumen.trim());
    const pubRow = pubIdx !== -1 ? pubRows[pubIdx] : null;

    // ── 2. Cari di "Dokumen Kerja sama" ──
    const dokRows = await getSheetData('Dokumen Kerja sama');
    const dokIdx = dokRows.findIndex(r => String(r[0] || '').trim() === idDokumen.trim());
    const dokRow = dokIdx !== -1 ? dokRows[dokIdx] : null;

    const catatan: string[] = [];

    if (!pubRow) {
      catatan.push('❌ TIDAK DITEMUKAN di sheet "Poin Publik Kegiatan" — berarti Extract Poin belum pernah berhasil disimpan untuk dokumen ini. Coba klik "Publikasikan" lagi di halaman Extract Poin dan perhatikan apakah muncul pesan error.');
    } else {
      const raw = {
        id: String(pubRow[0] || ''),
        idDokumen: String(pubRow[1] || ''),
        jenis: String(pubRow[2] || ''),
        judul: String(pubRow[3] || ''),
        namaMitra: String(pubRow[4] || ''),
        statusPublikasiTersimpan: String(pubRow[5] || ''),
        tanggalKegiatan: String(pubRow[6] || ''),
        tempatKegiatan: String(pubRow[7] || ''),
        poinDipilihRaw: String(pubRow[8] || ''),
        tglDibuat: String(pubRow[9] || ''),
        dibuatOleh: String(pubRow[10] || ''),
        divisi: String(pubRow[11] || ''),
        narasiKustom: String(pubRow[12] || ''),
      };

      if (!raw.id) catatan.push('❌ Kolom ID (kolom A) KOSONG — item ini tidak akan lolos filter r[0] di Beranda.');
      if (!raw.statusPublikasiTersimpan) catatan.push('❌ Kolom Status Publikasi (kolom F) KOSONG — item ini tidak akan lolos filter r[5] di Beranda.');

      let poinDipilihCount = 0;
      try {
        if (raw.poinDipilihRaw.startsWith('[')) poinDipilihCount = JSON.parse(raw.poinDipilihRaw).length;
        else if (raw.poinDipilihRaw) poinDipilihCount = raw.poinDipilihRaw.split('||').filter(Boolean).length;
      } catch { catatan.push('❌ Kolom Poin Dipilih (kolom I) GAGAL DI-PARSE — formatnya bukan JSON array yang valid: ' + raw.poinDipilihRaw); }

      if (poinDipilihCount === 0) {
        catatan.push('❌ POIN DIPILIH KOSONG (0 poin) — Beranda mensyaratkan minimal 1 poin dipilih. Kalau ini yang terjadi, coba buka lagi di Extract Poin, centang minimal 1 poin, lalu Publikasikan ulang.');
      } else {
        catatan.push(`✓ Poin dipilih: ${poinDipilihCount} poin — ini AMAN, tidak masalah.`);
      }

      if (raw.id && raw.statusPublikasiTersimpan && poinDipilihCount > 0) {
        catatan.push('✓ Data di "Poin Publik Kegiatan" terlihat LENGKAP dan seharusnya lolos filter dasar Beranda.');
      }

      if (dokRow) {
        const tglMulaiDok = String(dokRow[20] || '');
        const tglSelesaiDok = String(dokRow[21] || '');
        catatan.push(`ℹ Tanggal dari sheet Dokumen Kerja sama — Mulai: "${tglMulaiDok || '(kosong)'}", Selesai: "${tglSelesaiDok || '(kosong)'}". Beranda MEMPRIORITASKAN tanggal ini dibanding tanggal yang diisi di form Extract Poin.`);
        if (tglMulaiDok && isNaN(new Date(tglMulaiDok).getTime())) {
          catatan.push(`❌ Tanggal Mulai "${tglMulaiDok}" TIDAK BISA DIPARSING sebagai tanggal valid oleh JavaScript — ini bisa bikin kategori publikasi salah hitung.`);
        }
      } else {
        catatan.push('⚠ Dokumen ini tidak ditemukan di sheet "Dokumen Kerja sama" — mungkin ID yang dicari salah ketik, atau dokumennya sudah dipindah/diarsipkan.');
      }

      return NextResponse.json({ ditemukanDiPoinPublik: true, dataMentah: raw, catatan });
    }

    return NextResponse.json({ ditemukanDiPoinPublik: false, catatan });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}