import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

const DIVISI_LABEL: Record<string, string> = {
  'pencegahan':'Pencegahan', 'pemberantasan':'Pemberantasan',
  'rehabilitasi':'Rehabilitasi', 'pemberdayaan':'Pemberdayaan',
};

// Kolom Dokumen Kerja sama (0-based)
const DOK = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, STATUS:9,
  FOTO_FOLDER:18, TGL_KEG_MULAI:20, TGL_KEG_SELESAI:21, DIVISI:23,
};

async function listFoto(fotoFolderId: string) {
  if (!fotoFolderId) return [];
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ action:'listFoto', fotoFolderId }), redirect:'follow',
    });
    const d = await res.json();
    if (d.success && d.files) {
      return d.files.map((f: { fileId:string; nama:string; ukuran:number }) => ({
        fileId:f.fileId, nama:f.nama, ukuran:f.ukuran,
        thumbnailUrl:`/api/foto/${f.fileId}`,
      }));
    }
  } catch {}
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const detailFoto = searchParams.get('foto'); // fotoFolderId untuk ambil foto satu dokumen

    if (detailFoto) {
      const foto = await listFoto(detailFoto);
      return NextResponse.json({ foto });
    }

    // ── Hitung pendaftar e-planning ──
    let totalKegiatanEplanning = 0, totalSlot = 0, totalTerisi = 0;
    try {
      const kegRows = await getSheetData('Kegiatan Eplanning');
      kegRows.filter(r => r[0] && String(r[1]) === 'kerja-sama-kelembagaan').forEach(r => {
        totalKegiatanEplanning++;
        totalSlot   += parseInt(String(r[6]||'0'))||0;
        totalTerisi += parseInt(String(r[7]||'0'))||0;
      });
    } catch {}

    // ── Dokumen per status kegiatan ──
    const dokRows = await getSheetData('Dokumen Kerja sama');
    const mapDok = (r: unknown[]) => ({
      id:           String(r[DOK.ID]),
      jenis:        String(r[DOK.JENIS]||''),
      judul:        String(r[DOK.JUDUL]||''),
      idMitra:      String(r[DOK.ID_MITRA]||''),
      namaMitra:    String(r[DOK.NAMA_MITRA]||''),
      status:       String(r[DOK.STATUS]||''),
      fotoFolderId: String(r[DOK.FOTO_FOLDER]||''),
      tglMulai:     String(r[DOK.TGL_KEG_MULAI]||''),
      tglSelesai:   String(r[DOK.TGL_KEG_SELESAI]||''),
      divisi:       String(r[DOK.DIVISI]||''),
      divisiLabel:  DIVISI_LABEL[String(r[DOK.DIVISI]||'')] || String(r[DOK.DIVISI]||''),
    });

    const semuaDok = dokRows.filter(r => r[DOK.ID]).map(mapDok);

    const akanBerlangsung = semuaDok.filter(d => d.status === 'Kegiatan Akan Berlangsung');
    const berlangsung     = semuaDok.filter(d => d.status === 'Kegiatan Berlangsung');
    const telahSelesai    = semuaDok.filter(d => ['Kegiatan Selesai','MOU/PKS Berlaku','Kedaluwarsa'].includes(d.status));

    // Ambil foto hanya untuk yang berlangsung (untuk pemantauan)
    const berlangsungFoto = await Promise.all(
      berlangsung.map(async d => ({ ...d, foto: await listFoto(d.fotoFolderId) }))
    );

    return NextResponse.json({
      ringkasan: {
        totalKegiatanEplanning, totalSlot, totalTerisi,
        jmlAkanBerlangsung: akanBerlangsung.length,
        jmlBerlangsung: berlangsung.length,
        jmlTelahSelesai: telahSelesai.length,
      },
      akanBerlangsung,
      berlangsung: berlangsungFoto,
      telahSelesai,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE: admin hapus foto mitra → memicu notifikasi
export async function DELETE(req: NextRequest) {
  try {
    const { fileId, fotoFolderId, idDokumen, idMitra, namaFile, alasan } = await req.json();
    if (!fileId || !fotoFolderId) {
      return NextResponse.json({ message: 'fileId & fotoFolderId wajib.' }, { status: 400 });
    }
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        action:'hapusFoto', fileId, fotoFolderId, idDokumen, idMitra, namaFile,
        olehAdmin: true, alasan: alasan || '',
      }), redirect:'follow',
    });
    const d = await res.json();
    if (!d.success) return NextResponse.json({ message: d.error || 'Gagal hapus foto.' }, { status: 500 });
    return NextResponse.json({ message: 'Foto dihapus & notifikasi terkirim ke mitra.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}