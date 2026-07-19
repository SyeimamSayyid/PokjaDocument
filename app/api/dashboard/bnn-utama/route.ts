import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

const COL = {
  ID: 0, JENIS: 1, JUDUL: 2, ID_MITRA: 3, NAMA_MITRA: 4, TGL_DIBUAT: 5,
  TGL_BERLAKU: 6, TGL_BERAKHIR: 7, STATUS: 9,
};

// Dashboard khusus Admin BNN Utama — lintas semua institusi/provinsi (BUKAN
// per-mitra kayak dashboard BNNP/BNNK). Fokus utamanya: antrian dokumen
// berstatus "Selesai" yang menunggu keputusan (setuju final / kembalikan).
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

    // ── Antrian Review — dokumen berstatus "Selesai" menunggu BNN Utama ──
    const antrianReview = dokList
      .filter(r => String(r[COL.STATUS]).trim() === 'Selesai')
      .map(r => ({
        id: String(r[COL.ID]),
        jenis: String(r[COL.JENIS]),
        judul: String(r[COL.JUDUL]),
        namaMitra: String(r[COL.NAMA_MITRA]),
        tglBerlaku: String(r[COL.TGL_BERLAKU] || ''),
        tglBerakhir: String(r[COL.TGL_BERAKHIR] || ''),
        tglDibuat: String(r[COL.TGL_DIBUAT] || ''),
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

    return NextResponse.json({
      ringkasan: { totalInstitusi, totalDokumen, mouCount, pksCount, statusCount, menungguReview: antrianReview.length },
      chartSumber, chartMitra,
      antrianReview,
      riwayatKeputusan: riwayatLengkap,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}