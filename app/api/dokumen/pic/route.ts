import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

const DOK_COL = { ID: 0, ID_MITRA: 3, NAMA_MITRA: 4 };
const PJ_COL  = { ID_MITRA: 1, NAMA: 2, EMAIL: 7, WA: 8, PIC: 18 };

function normNama(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Normalisasi nomor WA ke format 62xxxxxxxxxx (anti bug +81, 0-depan, dsb)
function normWa(raw: string): string {
  let n = String(raw || '').trim().replace(/[^\d+]/g, '');
  if (!n) return '';
  n = n.replace(/^\+/, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('8')) n = '62' + n;
  else if (!n.startsWith('62')) n = '62' + n; // fallback aman
  return n;
}

// GET ?idDokumen=... → { namaPIC, namaInstitusi, label, email, noWa, waLink }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('idDokumen')?.trim();
    if (!idDokumen) return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });

    const dokRows = await getSheetData('Dokumen Kerja sama');
    const dok = dokRows.find(r => String(r[DOK_COL.ID] || '').trim() === idDokumen);
    if (!dok) return NextResponse.json({ namaPIC: '', namaInstitusi: '', label: '', email: '', noWa: '', waLink: '' });

    const idMitra = String(dok[DOK_COL.ID_MITRA] || '').trim();
    const namaInstitusi = String(dok[DOK_COL.NAMA_MITRA] || '').trim();

    let namaPIC = '';
    let email = '';
    let noWa = '';
    try {
      const pj = await getSheetData('Pengajuan Mitra');
      let matches = idMitra ? pj.filter(r => String(r[PJ_COL.ID_MITRA] || '').trim() === idMitra) : [];
      if (matches.length === 0 && namaInstitusi) {
        const target = normNama(namaInstitusi);
        matches = pj.filter(r => normNama(String(r[PJ_COL.NAMA] || '')) === target);
      }
      // Ambil data terlengkap dari baris paling akhir yang mengisi tiap field
      for (const r of matches) {
        const p = String(r[PJ_COL.PIC] || '').trim();
        const e = String(r[PJ_COL.EMAIL] || '').trim();
        const w = String(r[PJ_COL.WA] || '').trim();
        if (p) namaPIC = p;
        if (e) email = e;
        if (w) noWa = w;
      }
    } catch { /* sheet Pengajuan Mitra opsional */ }

    const label = namaPIC ? `${namaPIC} (${namaInstitusi})` : namaInstitusi;
    const waLink = noWa ? `https://wa.me/${normWa(noWa)}` : '';

    return NextResponse.json({ namaPIC, namaInstitusi, label, email, noWa, waLink });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}