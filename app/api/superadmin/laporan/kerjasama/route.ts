import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

const DOK_COL = {
  ID: 0, JENIS: 1, JUDUL: 2, ID_MITRA: 3, NAMA_MITRA: 4,
  TGL_BERLAKU: 6, TGL_BERAKHIR: 7, DURASI: 8, STATUS: 9,
  DIVISI: 23,
};
const PJ_COL = { ID_MITRA: 1, NAMA: 2, EMAIL: 7, WA: 8, PIC: 18 };

const DIVISI_URUTAN = ['pemberantasan', 'rehabilitasi', 'pencegahan', 'pemberdayaan'];

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
  try {
    const { searchParams } = new URL(req.url);
    const tahun = parseInt(searchParams.get('tahun') || '0');
    if (!tahun) {
      return NextResponse.json({ message: 'Parameter tahun wajib diisi.' }, { status: 400 });
    }

    const dokRows = await getSheetData('Dokumen Kerja sama');
    let pjRows: string[][] = [];
    try { pjRows = await getSheetData('Pengajuan Mitra'); } catch { pjRows = []; }

    // Kerja sama yang BERLAKU di tahun tsb — dicek dari Tanggal Berlaku
    const filtered = dokRows.filter(r => {
      if (!r[DOK_COL.ID]) return false;
      const tgl = new Date(String(r[DOK_COL.TGL_BERLAKU]));
      return !isNaN(tgl.getTime()) && tgl.getFullYear() === tahun;
    });

    const data = filtered.map((r, i) => {
      const idMitra = String(r[DOK_COL.ID_MITRA] || '').trim();
      const namaInstitusi = String(r[DOK_COL.NAMA_MITRA] || '').trim();
      const kontak = resolveKontak(idMitra, namaInstitusi, pjRows);
      const divisiRaw = String(r[DOK_COL.DIVISI] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      return {
        no: i + 1,
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

    return NextResponse.json({ tahun, satker: 'BNNP SULSEL', data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}