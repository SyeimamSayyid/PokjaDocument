import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

const COL = {
  ID: 0, JENIS: 1, JUDUL: 2, ID_MITRA: 3, NAMA_MITRA: 4, TGL_DIBUAT: 5,
  TGL_BERLAKU: 6, TGL_BERAKHIR: 7, STATUS: 9,
  LOG_EDIT: 30, // siapa terakhir edit dokumen ini, format "role|nama|waktu|level"
  ACC_FINAL_UTAMA: 36, // flag sudah di-ACC final BNN Utama, format "ya|waktu|nama"
};

// Dashboard khusus Admin BNN Utama — lintas semua institusi/provinsi (BUKAN
// per-mitra kayak dashboard BNNP/BNNK). Fokus utamanya: antrian dokumen
// berstatus "Draft" dari seluruh pengajuan sistem.
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan.' }, { status: 401 });

  const s = session as Record<string, unknown>;
  const level = session.role === 'superadmin' ? 'bnnp_bnnk' : (String(s.level || '') === 'utama' ? 'utama' : 'bnnp_bnnk');
  if (level !== 'utama') {
    return NextResponse.json({ message: 'Halaman ini khusus Admin BNN Utama.' }, { status: 403 });
  }

  try {
    const dokRows = await getSheetData('Dokumen Kerja sama');
    const komentarRows = await getSheetData('Komentar Revisi').catch(() => []);
    const arsipRows = await getSheetData('Arsip Dokumen').catch(() => []);
    const mitraRows = await getSheetData('Mitra').catch(() => []);

    const dokList = dokRows.filter(r => r[COL.ID]);
    const arsipList = (arsipRows || []).filter(r => r[0]);
    const mitraTerdaftar = (mitraRows || []).filter(r => r[0]).length;

    // ── Ringkasan lintas-provinsi ──
    const institusiSet = new Set(dokList.map(r => String(r[COL.NAMA_MITRA] || '').trim().toLowerCase()).filter(Boolean));
    const totalInstitusi = institusiSet.size;
    const totalDokumen = dokList.length;
    const mouCount = dokList.filter(r => String(r[COL.JENIS]).toUpperCase() === 'MOU').length;
    const pksCount = dokList.filter(r => String(r[COL.JENIS]).toUpperCase() === 'PKS').length;

    const statusCount: Record<string, number> = {};
    dokList.forEach(r => {
      const st = String(r[COL.STATUS] || '').trim();
      statusCount[st] = (statusCount[st] || 0) + 1;
    });

    // ── Data buat chart: dokumen Sistem (aktif) vs Arsip, dan Mitra terdaftar ──
    const chartSumber = {
      sistem: dokList.length,
      arsip: arsipList.length,
    };
    const chartMitra = {
      totalInstitusi: new Set(dokList.map(r => String(r[COL.NAMA_MITRA] || '').trim().toLowerCase()).filter(Boolean)).size,
      mitraTerdaftar,
    };

    // ── Antrian Draft — seluruh dokumen dari pengajuan sistem yang masih
    // berstatus "Draft" (belum diselesaikan mitra/admin BNNP/BNNK) ──
    const antrianReview = dokList
      .filter(r => String(r[COL.STATUS]).trim() === 'Draft')
      .map(r => ({
        id: String(r[COL.ID]),
        jenis: String(r[COL.JENIS]),
        judul: String(r[COL.JUDUL]),
        namaMitra: String(r[COL.NAMA_MITRA]),
        tglBerlaku: String(r[COL.TGL_BERLAKU] || ''),
        tglBerakhir: String(r[COL.TGL_BERAKHIR] || ''),
        tglDibuat: String(r[COL.TGL_DIBUAT] || ''),
        manualLog: String(r[COL.LOG_EDIT] || ''),
      }))
      .sort((a, b) => a.tglDibuat.localeCompare(b.tglDibuat)); // yang lama duluan (FIFO)

    // ── Riwayat Keputusan BNN Utama — dari Komentar Revisi, filter pesan yang
    // menyebut "(BNN Utama)" (lihat catatKomentarSistem di dokumen-id-route.ts)
    const riwayatKeputusan = (komentarRows || [])
      .filter(r => r[0] && /\(BNN Utama\)/.test(String(r[5] || '')))
      .map(r => ({
        idDokumen: String(r[1]),
        pesan: String(r[5]),
        tglDibuat: String(r[6]),
      }))
      .sort((a, b) => b.tglDibuat.localeCompare(a.tglDibuat))
      .slice(0, 15);

    // Lengkapi riwayat dengan judul+institusi dokumen terkait (buat ditampilkan)
    const dokMapById = new Map(dokList.map(r => [String(r[COL.ID]), r]));
    const riwayatLengkap = riwayatKeputusan.map(rw => {
      const dok = dokMapById.get(rw.idDokumen);
      return {
        ...rw,
        judul: dok ? String(dok[COL.JUDUL]) : '(dokumen tidak ditemukan)',
        namaMitra: dok ? String(dok[COL.NAMA_MITRA]) : '',
      };
    });

    // ── Dokumen Baru Diacc — 5 dokumen TERBARU dibuat admin BNNP/BNNK, apa pun
    // statusnya sekarang (bisa saja sudah lewat dari Draft) — dipakai buat
    // card notifikasi ringkas di pojok atas dashboard, TERPISAH dari Antrian
    // Draft (yang isinya SEMUA dokumen masih Draft, bisa banyak & lama). ──
    const dokumenBaru = [...dokList]
      .sort((a, b) => String(b[COL.TGL_DIBUAT] || '').localeCompare(String(a[COL.TGL_DIBUAT] || '')))
      .slice(0, 5)
      .map(r => ({
        id: String(r[COL.ID]),
        jenis: String(r[COL.JENIS]),
        judul: String(r[COL.JUDUL]),
        namaMitra: String(r[COL.NAMA_MITRA]),
        status: String(r[COL.STATUS] || ''),
        tglDibuat: String(r[COL.TGL_DIBUAT] || ''),
      }));

    // ── Dokumen Selesai — seluruh dokumen MOU/PKS lintas provinsi yang sudah
    // mencapai status "Selesai" (bukan Draft/Dalam Proses lagi) — supaya BNN
    // Utama bisa lihat sekilas dokumen mana saja yang sudah tuntas diproses,
    // tanpa perlu buka Daftar Dokumen dan filter manual satu-satu. ──
    const dokumenSelesai = dokList
      .filter(r => String(r[COL.STATUS]).trim() === 'Selesai')
      .map(r => ({
        id: String(r[COL.ID]),
        jenis: String(r[COL.JENIS]),
        judul: String(r[COL.JUDUL]),
        namaMitra: String(r[COL.NAMA_MITRA]),
        tglBerlaku: String(r[COL.TGL_BERLAKU] || ''),
        tglBerakhir: String(r[COL.TGL_BERAKHIR] || ''),
        tglDibuat: String(r[COL.TGL_DIBUAT] || ''),
        manualLog: String(r[COL.LOG_EDIT] || ''),
      }))
      .sort((a, b) => b.tglDibuat.localeCompare(a.tglDibuat)); // yang terbaru duluan

    // ── Dokumen Disetujui — sudah di-ACC final oleh Admin BNN Utama sendiri
    // (beda dari "Dokumen Selesai" di atas, yang cuma soal status alur kerja
    // BNNP/BNNK — ini spesifik soal keputusan final BNN Utama). ──
    const dokumenDisetujui = dokList
      .filter(r => String(r[COL.ACC_FINAL_UTAMA] || '').startsWith('ya'))
      .map(r => {
        const [, waktu, nama] = String(r[COL.ACC_FINAL_UTAMA] || '').split('|');
        return {
          id: String(r[COL.ID]), jenis: String(r[COL.JENIS]), judul: String(r[COL.JUDUL]),
          namaMitra: String(r[COL.NAMA_MITRA]), tglDisetujui: waktu || '', disetujuiOleh: nama || '',
        };
      })
      .sort((a, b) => b.tglDisetujui.localeCompare(a.tglDisetujui));

    return NextResponse.json({
      ringkasan: { totalInstitusi, totalDokumen, mouCount, pksCount, statusCount, menungguReview: antrianReview.length },
      chartSumber, chartMitra,
      antrianReview,
      dokumenBaru,
      dokumenSelesai,
      dokumenDisetujui,
      riwayatKeputusan: riwayatLengkap,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}