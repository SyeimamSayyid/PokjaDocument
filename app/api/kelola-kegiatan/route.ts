import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

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

// ── Perhitungan bucket tanggal — SAMA PERSIS dengan /api/beranda, supaya
// Kelola Kegiatan dan halaman publik selalu konsisten mengelompokkan
// kegiatan yang sama ke kategori yang sama. Dibandingkan sebagai STRING
// tanggal (bukan Date object) berbasis zona waktu WITA, biar tidak salah
// kategori gara-gara perbedaan UTC vs waktu lokal server. ──
function tanggalHariIniWITA(): string {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
}
function tanggalSaja(str: string): string {
  if (!str) return '';
  const m = String(str).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
}
function hitungBucket(tglMulai: string, tglSelesai: string, fallback: string): string {
  if (!tglMulai && !tglSelesai) return fallback || 'akan-berlangsung';
  const hariIni = tanggalHariIniWITA();
  const mulai   = tanggalSaja(tglMulai);
  const selesai = tanggalSaja(tglSelesai);
  if (selesai && hariIni > selesai) return 'telah-berlangsung';
  if (mulai && hariIni >= mulai)    return 'berlangsung';
  return 'akan-berlangsung';
}

async function listFoto(fotoFolderId: string) {
  if (!fotoFolderId) return [];
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

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

    // ── Dokumen kerja sama (untuk lookup foto/tanggal/divisi) ──
    const dokRows = await getSheetData('Dokumen Kerja sama');
    const dokMap: Record<string, { jenis:string; judul:string; idMitra:string; namaMitra:string;
      status:string; fotoFolderId:string; tglMulai:string; tglSelesai:string; divisi:string }> = {};
    dokRows.forEach(r => {
      if (!r[DOK.ID]) return;
      dokMap[String(r[DOK.ID])] = {
        jenis: String(r[DOK.JENIS]||''), judul: String(r[DOK.JUDUL]||''),
        idMitra: String(r[DOK.ID_MITRA]||''), namaMitra: String(r[DOK.NAMA_MITRA]||''),
        status: String(r[DOK.STATUS]||''), fotoFolderId: String(r[DOK.FOTO_FOLDER]||''),
        tglMulai: String(r[DOK.TGL_KEG_MULAI]||''), tglSelesai: String(r[DOK.TGL_KEG_SELESAI]||''),
        divisi: String(r[DOK.DIVISI]||''),
      };
    });

    // Deteksi dokumen yang berasal dari pendaftaran E-Planning — sama
    // seperti logika di generate-kode-route.ts, dicek via kolom ID_DOKUMEN
    // di sheet "Pendaftaran Kegiatan".
    let idDokumenDariEplanning = new Set<string>();
    try {
      const daftarRows = await getSheetData('Pendaftaran Kegiatan');
      daftarRows.forEach(r => { if (r[12]) idDokumenDariEplanning.add(String(r[12]).trim()); });
    } catch {}

    // ── SUMBER UTAMA: "Poin Publik Kegiatan" — sama seperti yang dibaca
    // /api/beranda. Sebelumnya halaman ini baca status dokumen secara
    // langsung dan TIDAK PERNAH menampilkan hasil Extract Poin — sekarang
    // disatukan supaya konsisten dengan apa yang publik lihat di Beranda. ──
    const pubRows = await getSheetData('Poin Publik Kegiatan');
    const semuaDok = pubRows
      .filter(r => r[0] && r[1]) // ID Poin Publik & idDokumen harus ada
      .map(r => {
        const idDokumen = String(r[1]);
        const dok = dokMap[idDokumen];
        let poinCount = 0;
        const raw = String(r[8] || '');
        try {
          if (raw.startsWith('[')) poinCount = JSON.parse(raw).length;
          else if (raw) poinCount = raw.split('||').filter(Boolean).length;
        } catch { poinCount = 0; }

        const tglMulai   = dok?.tglMulai   || String(r[6] || '');
        const tglSelesai = dok?.tglSelesai || String(r[13] || ''); // r[13] = fallback dari Poin Publik Kegiatan sendiri
        const divisi     = String(r[11] || '') || dok?.divisi || '';

        return {
          id: idDokumen,
          jenis: dok?.jenis || String(r[2] || ''),
          judul: dok?.judul || String(r[3] || ''),
          idMitra: dok?.idMitra || '',
          namaMitra: dok?.namaMitra || String(r[4] || ''),
          status: hitungBucket(tglMulai, tglSelesai, String(r[5] || '')),
          fotoFolderId: dok?.fotoFolderId || '',
          tglMulai, tglSelesai, divisi,
          divisiLabel: DIVISI_LABEL[divisi] || divisi,
          poinCount,
          dariEplanning: idDokumenDariEplanning.has(idDokumen),
        };
      })
      .filter(d => d.poinCount > 0); // konsisten dengan syarat tampil di Beranda

    const akanBerlangsung = semuaDok.filter(d => d.status === 'akan-berlangsung');
    const berlangsung     = semuaDok.filter(d => d.status === 'berlangsung');
    const telahSelesai    = semuaDok.filter(d => d.status === 'telah-berlangsung');

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
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

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