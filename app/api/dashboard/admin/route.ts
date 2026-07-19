import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

const KEG = { ID: 0, STATUS: 11 };

// Kolom "Dokumen Kerja sama" yang relevan di sini (0-based) — index 17 itu
// TERAKHIR_DIAKSES (log kunjungan, format beda), BUKAN log edit. Siapa yang
// terakhir MENGUBAH dokumen (dipakai EditPencilIndicator) ada di index 29,
// ditulis dari dokumen-id-route.ts dan generate-kode-route.ts (format "role|nama|waktu").
// index 29 SUDAH DIPAKAI di Kode.gs untuk "Milestone Diingatkan" (COL_MILESTONE) — jangan pakai ulang!
const DOK_LOG_EDIT_COL = 30;

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const [dokRows, pengRows, mitraRows, kegRows, daftarRows, arsipRows] = await Promise.all([
      getSheetData('Dokumen Kerja sama'),
      getSheetData('Pengajuan Mitra'),
      getSheetData('Mitra'),
      getSheetData('Kegiatan Eplanning'),
      getSheetData('Pendaftaran Kegiatan'),
      getSheetData('Arsip Dokumen').catch(() => []),
    ]);

    const now = new Date();
    const batasExpire = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const dokList = dokRows.filter(r => r[0]);
    let dokDraft = 0, dokAktif = 0, dokHampirExpire = 0, dokExpired = 0;
    let mouCount = 0, pksCount = 0;
    const alertExpire: { id: string; jenis: string; judul: string; namaMitra: string; tglBerakhir: string; sisaHari: number }[] = [];
    const dokumenTerbaru: { id: string; jenis: string; judul: string; namaMitra: string; tglBerakhir: string; status: string; manualLog: string }[] = [];

    dokList.forEach(r => {
      const status = String(r[9] || '').trim();
      const jenis  = String(r[1] || '').trim();

      if (jenis === 'MOU') mouCount++;
      if (jenis === 'PKS') pksCount++;

      if (['Draft','Diajukan','Ditinjau'].includes(status)) dokDraft++;
      else if (['Dalam Proses','Selesai','Kegiatan Akan Berlangsung','Kegiatan Berlangsung','Kegiatan Selesai','MOU/PKS Berlaku','Disetujui'].includes(status)) dokAktif++;
      else if (status === 'Kedaluwarsa') dokExpired++;

      const tglBerakhir = r[7] ? new Date(String(r[7])) : null;
      if (tglBerakhir && !isNaN(tglBerakhir.getTime())) {
        const sisaMs   = tglBerakhir.getTime() - now.getTime();
        const sisaHari = Math.ceil(sisaMs / 86400000);
        if (sisaMs > 0 && tglBerakhir <= batasExpire && status !== 'Kedaluwarsa') {
          dokHampirExpire++;
          alertExpire.push({
            id: String(r[0]), jenis, judul: String(r[2]),
            namaMitra: String(r[4]), tglBerakhir: String(r[7]), sisaHari,
          });
        }
      }
    });

    dokList.slice(-5).reverse().forEach(r => {
      dokumenTerbaru.push({
        id: String(r[0]), jenis: String(r[1]), judul: String(r[2]),
        namaMitra: String(r[4]), tglBerakhir: String(r[7]), status: String(r[9]),
        manualLog: String(r[DOK_LOG_EDIT_COL] || ''),
      });
    });

    const pjnList = pengRows.filter(r => r[0]);
    const pengajuanMenunggu = pjnList.filter(r => ['Diajukan','Ditinjau'].includes(String(r[9] || ''))).length;
    const pengajuanDiterima = pjnList.filter(r => String(r[9] || '') === 'Disetujui').length;
    const pengajuanDitolak  = pjnList.filter(r => String(r[9] || '') === 'Ditolak').length;

    const kegList = kegRows.filter(r => r[KEG.ID]);
    const rencanaKegiatanAktif = kegList.filter(r =>
      String(r[KEG.STATUS] || '').trim().toLowerCase() === 'dibuka'
    ).length;

    const daftarList = daftarRows.filter(r => r[0]);
    const pendaftaranMenunggu = daftarList.filter(r =>
      r.some(cell => String(cell || '').trim().toLowerCase() === 'menunggu')
    ).length;

    const ksStats = {
      draft:        dokList.filter(r => ['Draft','Diajukan','Ditinjau'].includes(String(r[9]))).length,
      'akan-mulai': dokList.filter(r => ['Selesai','Kegiatan Akan Berlangsung'].includes(String(r[9]))).length,
      berlangsung:  dokList.filter(r => String(r[9]) === 'Kegiatan Berlangsung').length,
      selesai:      dokList.filter(r => ['Kegiatan Selesai','MOU/PKS Berlaku','Kedaluwarsa'].includes(String(r[9]))).length,
    };

    const arsipList = (arsipRows || []).filter(r => r[0]);
    const mitraTerdaftar = await (async () => {
      // Dihitung dari institusi UNIK di endpoint Kontak Mitra — sama persis
      // cara halaman Kontak Mitra menghitung "instansiOptions", bukan baca
      // sheet Mitra mentah (yang bisa kosong/tidak sinkron).
      try {
        const origin = req.nextUrl.origin;
        const r = await fetch(`${origin}/api/kontak-mitra`, {
          headers: { cookie: req.headers.get('cookie') || '' },
        });
        const d = await r.json();
        const namaSet = new Set(
          (d.data || [])
            .map((k: any) => String(k.namaInstitusi || '').trim().toLowerCase().replace(/\s+/g, ' '))
            .filter(Boolean)
        );
        return namaSet.size;
      } catch {
        // Fallback kalau internal fetch gagal — hitung manual dari sheet Mitra
        return (mitraRows || []).filter(r => r[0]).length;
      }
    })();
    const arsipMouCount = arsipList.filter(r => String(r[2] || '').toUpperCase() === 'MOU').length;
    const arsipPksCount = arsipList.filter(r => String(r[2] || '').toUpperCase() === 'PKS').length;

    return NextResponse.json({
      stats: {
        pengajuanMenunggu, pengajuanDiterima, pengajuanDitolak,
        dokDraft, dokAktif, dokHampirExpire, dokExpired,
        totalDok: dokList.length,
        mouCount, pksCount,
        arsipMouCount, arsipPksCount, arsipTotal: arsipList.length,
        mitraTerdaftar,
        rencanaKegiatanAktif,
        pendaftaranMenunggu,
        ...ksStats,
      },
      dokumenTerbaru,
      alertExpire: alertExpire.sort((a, b) => a.sisaHari - b.sisaHari),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}