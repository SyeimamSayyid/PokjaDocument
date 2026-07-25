import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

const DOK_COL = {
  ID: 0, JENIS: 1, JUDUL: 2, ID_MITRA: 3, NAMA_MITRA: 4,
  TGL_BERLAKU: 6, TGL_BERAKHIR: 7, DURASI: 8, STATUS: 9,
  DIVISI: 23,
};
const PJ_COL = { ID_MITRA: 1, NAMA: 2, EMAIL: 7, WA: 8, PIC: 18 };

// Kolom Arsip Dokumen (0-based) — sudah punya kontak sendiri, tidak perlu
// cross-reference ke Pengajuan Mitra kayak dokumen sistem.
const ARS_COL = {
  ID: 0, NAMA_INSTITUSI: 1, JENIS: 2, JUDUL: 3, TGL_BERLAKU: 4, TGL_BERAKHIR: 5,
  PIC: 9, EMAIL: 10, WA: 11, TGL_ARSIP: 14, DIVISI: 16,
};

function normNama(s: unknown): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveKontak(idMitra: string, namaInstitusi: string, pjRows: string[][]) {
  let matches = idMitra ? pjRows.filter(r => String(r[PJ_COL.ID_MITRA] || '').trim() === idMitra) : [];
  if (matches.length === 0 && namaInstitusi) {
    const target = normNama(namaInstitusi);
    matches = pjRows.filter(r => normNama(r[PJ_COL.NAMA]) === target);
  }
  let namaPIC = '', email = '', wa = '';
  for (const r of matches) {
    if (r[PJ_COL.PIC]) namaPIC = String(r[PJ_COL.PIC]).trim();
    if (r[PJ_COL.EMAIL]) email = String(r[PJ_COL.EMAIL]).trim();
    if (r[PJ_COL.WA]) wa = String(r[PJ_COL.WA]).trim();
  }
  return { namaPIC, email, wa };
}

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const tahun = parseInt(searchParams.get('tahun') || '0');
    const sumberFilter = (searchParams.get('sumber') || 'semua') as 'semua' | 'sistem' | 'arsip';
    if (!tahun) {
      return NextResponse.json({ message: 'Parameter tahun wajib diisi.' }, { status: 400 });
    }

    const [dokRows, pjRowsRaw, arsipRows] = await Promise.all([
      getSheetData('Dokumen Kerja sama'),
      getSheetData('Pengajuan Mitra').catch(() => []),
      getSheetData('Arsip Dokumen').catch(() => []),
    ]);
    const pjRows: string[][] = pjRowsRaw || [];

    // ── Dokumen SISTEM yang berlaku di tahun tsb ──
    const dokFiltered = dokRows.filter(r => {
      if (!r[DOK_COL.ID]) return false;
      const tgl = new Date(String(r[DOK_COL.TGL_BERLAKU]));
      return !isNaN(tgl.getTime()) && tgl.getFullYear() === tahun;
    });

    const dataSistem = dokFiltered.map(r => {
      const idMitra = String(r[DOK_COL.ID_MITRA] || '').trim();
      const namaInstitusi = String(r[DOK_COL.NAMA_MITRA] || '').trim();
      const kontak = resolveKontak(idMitra, namaInstitusi, pjRows);
      const divisiRaw = String(r[DOK_COL.DIVISI] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      return {
        sumber: 'Sistem' as const,
        tglBerlaku: String(r[DOK_COL.TGL_BERLAKU] || ''),
        jenis: String(r[DOK_COL.JENIS] || ''),
        instansi: namaInstitusi,
        judul: String(r[DOK_COL.JUDUL] || ''),
        namaPIC: kontak.namaPIC,
        noPIC: kontak.wa,
        emailPIC: kontak.email,
        bidang: {
          pemberantasan: divisiRaw.includes('pemberantasan'),
          rehabilitasi: divisiRaw.includes('rehabilitasi'),
          pencegahan: divisiRaw.includes('pencegahan'),
          pemberdayaan: divisiRaw.includes('pemberdayaan'),
        },
        durasi: String(r[DOK_COL.DURASI] || ''),
        tglBerakhir: String(r[DOK_COL.TGL_BERAKHIR] || ''),
      };
    });

    // ── Dokumen ARSIP yang MASUK ke arsip di tahun tsb (bukan tanggal berlaku) ──
    const arsipFiltered = (arsipRows || []).filter(r => {
      if (!r[ARS_COL.ID]) return false;
      const tglMasuk = new Date(String(r[ARS_COL.TGL_ARSIP]));
      return !isNaN(tglMasuk.getTime()) && tglMasuk.getFullYear() === tahun;
    });

    const dataArsip = arsipFiltered.map(r => {
      const divisiRaw = String(r[ARS_COL.DIVISI] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      return {
        sumber: 'Arsip' as const,
        tglBerlaku: String(r[ARS_COL.TGL_BERLAKU] || ''),
        jenis: String(r[ARS_COL.JENIS] || ''),
        instansi: String(r[ARS_COL.NAMA_INSTITUSI] || ''),
        judul: String(r[ARS_COL.JUDUL] || ''),
        namaPIC: String(r[ARS_COL.PIC] || ''),
        noPIC: String(r[ARS_COL.WA] || ''),
        emailPIC: String(r[ARS_COL.EMAIL] || ''),
        bidang: {
          pemberantasan: divisiRaw.includes('pemberantasan'),
          rehabilitasi: divisiRaw.includes('rehabilitasi'),
          pencegahan: divisiRaw.includes('pencegahan'),
          pemberdayaan: divisiRaw.includes('pemberdayaan'),
        },
        durasi: '',
        tglBerakhir: String(r[ARS_COL.TGL_BERAKHIR] || ''),
      };
    });

    // Gabung, urutkan berdasarkan tanggal berlaku, lalu nomori ulang
    const sumberTerpilih = sumberFilter === 'sistem' ? dataSistem : sumberFilter === 'arsip' ? dataArsip : [...dataSistem, ...dataArsip];
    const gabungan = sumberTerpilih
      .sort((a, b) => new Date(a.tglBerlaku).getTime() - new Date(b.tglBerlaku).getTime())
      .map((d, i) => ({ no: i + 1, ...d }));

    // ── Tren per tahun — SEMUA data (bukan cuma tahun yang difilter), gabung
    // Sistem + Arsip, dipakai buat chart garis di atas laporan. Sistem pakai
    // Tanggal Berlaku, Arsip pakai Tanggal Masuk Arsip (konsisten dengan
    // logika filter utama di atas). ──
    const hitungTahun = new Map<number, number>();
    dokRows.forEach(r => {
      if (!r[DOK_COL.ID]) return;
      const tgl = new Date(String(r[DOK_COL.TGL_BERLAKU]));
      if (!isNaN(tgl.getTime())) hitungTahun.set(tgl.getFullYear(), (hitungTahun.get(tgl.getFullYear()) || 0) + 1);
    });
    (arsipRows || []).forEach(r => {
      if (!r[ARS_COL.ID]) return;
      const tgl = new Date(String(r[ARS_COL.TGL_ARSIP]));
      if (!isNaN(tgl.getTime())) hitungTahun.set(tgl.getFullYear(), (hitungTahun.get(tgl.getFullYear()) || 0) + 1);
    });
    const tren = Array.from(hitungTahun.entries())
      .map(([tahunItem, jumlah]) => ({ tahun: tahunItem, jumlah }))
      .sort((a, b) => a.tahun - b.tahun);

    return NextResponse.json({
      tahun, satker: 'BNNP SULSEL', data: gabungan, tren,
      ringkasan: {
        totalSistem: dataSistem.length,
        totalArsip: dataArsip.length,
        totalMou: gabungan.filter(d => d.jenis.toUpperCase() === 'MOU').length,
        totalPks: gabungan.filter(d => d.jenis.toUpperCase() === 'PKS').length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}