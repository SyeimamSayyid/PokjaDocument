import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, findRow, updateCell, appendRow } from '@/lib/sheet';
import { google } from 'googleapis';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const COL_DOK = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_DIBUAT:5,
  TGL_BERLAKU:6, TGL_BERAKHIR:7, DURASI:8, STATUS:9, KODE:10,
  KODE_EXP:11, DOCS_ID:12, DOCS_URL:13, FOLDER_ID:14,
  DIBUAT_OLEH:15, CATATAN:16, TERAKHIR_DIAKSES:17, FOTO_FOLDER:18,
  // BARU — dipakai untuk notifikasi "siap dipublikasikan" di halaman Extract Poin
  TGL_KEG_MULAI:20, TGL_KEG_SELESAI:21,
};

// ── Perhitungan bucket tanggal — SAMA PERSIS dengan /api/beranda dan
// /api/kelola-kegiatan, supaya pesan sukses di halaman ini bisa kasih tau
// admin dengan AKURAT kegiatan ini bakal muncul di tab mana. ──
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

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
  });
}

function toTitleCase(str: string): string {
  const kecil = ['dan','atau','di','ke','dari','yang','dengan','untuk','dalam','oleh','pada'];
  return str.toLowerCase().split(' ').map((w, i) =>
    i === 0 || !kecil.includes(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w
  ).join(' ');
}

interface PasalData {
  nomor: number;
  judul: string;
  poin: string[];
}

function extractSemuaPasal(paragraphs: string[]): PasalData[] {
  const hasil: PasalData[] = [];
  let currentPasal: PasalData | null = null;
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) continue;
    const matchPasal = p.match(/^(?:PASAL|Pasal)\s+(\d+)$/i);
    if (matchPasal) {
      if (currentPasal) hasil.push(currentPasal);
      const nomor = parseInt(matchPasal[1]);
      let judul = '';
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prev = paragraphs[j].trim();
        if (!prev) continue;
        if (prev.match(/^(?:BAB|Bab)\s+/i)) continue;
        if (prev.match(/^(?:PASAL|Pasal)\s+\d+/i)) break;
        if (
          prev.length >= 3 && prev.length <= 100 &&
          !prev.match(/^(Dalam|Yang|Untuk|Bahwa|Pada|Para|Pihak|Setiap|Apabila|Berdasarkan|Dengan|Nomor|Undang|Peraturan|Instruksi|Permendikbud)/i) &&
          !prev.match(/^\d/) && !prev.match(/^[a-z]/)
        ) { judul = prev; break; }
      }
      currentPasal = { nomor, judul: toTitleCase(judul || `Pasal ${nomor}`), poin: [] };
      continue;
    }
    if (currentPasal) {
      if (p.match(/^(?:BAB|Bab|PASAL|Pasal)\s+/i)) continue;
      if (p.length < 5) continue;
      if (p.match(/^[a-zA-Z0-9][\.\)]\s/)) {
        const content = p.replace(/^[a-zA-Z0-9][\.\)]\s+/, '').trim();
        if (content.length > 5) currentPasal.poin.push(content);
      } else if (p.match(/^\(\d+\)/)) {
        const content = p.replace(/^\(\d+\)\s*/, '').trim();
        if (content.length > 5) currentPasal.poin.push(content);
      } else if (p.length > 20 && !p.match(/^[IVX]+\./)) {
        if (currentPasal.poin.length < 8) {
          currentPasal.poin.push(p.length > 200 ? p.substring(0, 200) + '...' : p);
        }
      }
    }
  }
  if (currentPasal) hasil.push(currentPasal);
  return hasil.slice(0, 15);
}

// ── GET: List dokumen Selesai + poin tersimpan ─────────────
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idDokumen  = searchParams.get('idDokumen');
    const getPoin    = searchParams.get('getPoin') === 'true';

    // Deteksi dokumen yang berasal dari pendaftaran E-Planning — sama
    // seperti logika di generate-kode-route.ts & kelola-kegiatan-route.ts.
    let idDokumenDariEplanning = new Set<string>();
    try {
      const daftarRows = await getSheetData('Pendaftaran Kegiatan');
      daftarRows.forEach(r => { if (r[12]) idDokumenDariEplanning.add(String(r[12]).trim()); });
    } catch {}

    const rows = await getSheetData('Dokumen Kerja sama');
    const selesai = rows
      .filter(r => r[COL_DOK.ID] && String(r[COL_DOK.STATUS]).trim() === 'Selesai')
      .map(r => ({
        id:          String(r[COL_DOK.ID]),
        jenis:       String(r[COL_DOK.JENIS]),
        judul:       String(r[COL_DOK.JUDUL]),
        namaMitra:   String(r[COL_DOK.NAMA_MITRA]),
        status:      String(r[COL_DOK.STATUS]),
        docsId:      String(r[COL_DOK.DOCS_ID] || ''),
        tglBerlaku:  String(r[COL_DOK.TGL_BERLAKU]),
        tglBerakhir: String(r[COL_DOK.TGL_BERAKHIR]),
        fotoFolderId: String(r[COL_DOK.FOTO_FOLDER] || ''),
        tglKegiatanMulai:   String(r[COL_DOK.TGL_KEG_MULAI] || ''),
        tglKegiatanSelesai: String(r[COL_DOK.TGL_KEG_SELESAI] || ''),
        dariEplanning: idDokumenDariEplanning.has(String(r[COL_DOK.ID])),
      }));

    if (idDokumen && getPoin) {
      const dok = selesai.find(d => d.id === idDokumen) ||
        rows.filter(r => r[COL_DOK.ID]).map(r => ({
          id: String(r[COL_DOK.ID]), jenis: String(r[COL_DOK.JENIS]),
          judul: String(r[COL_DOK.JUDUL]), namaMitra: String(r[COL_DOK.NAMA_MITRA]),
          status: String(r[COL_DOK.STATUS]), docsId: String(r[COL_DOK.DOCS_ID] || ''),
          tglBerlaku: String(r[COL_DOK.TGL_BERLAKU]), tglBerakhir: String(r[COL_DOK.TGL_BERAKHIR]),
          fotoFolderId: String(r[COL_DOK.FOTO_FOLDER] || ''),
          tglKegiatanMulai: String(r[COL_DOK.TGL_KEG_MULAI] || ''),
          tglKegiatanSelesai: String(r[COL_DOK.TGL_KEG_SELESAI] || ''),
        })).find(d => d.id === idDokumen);

      if (!dok || !dok.docsId) {
        return NextResponse.json({ message: 'Dokumen tidak ditemukan atau tidak punya Docs.' }, { status: 404 });
      }

      let paragraphs: string[] = [];
      try {
        const auth = getAuth();
        const docs = google.docs({ version: 'v1', auth });
        const doc  = await docs.documents.get({ documentId: dok.docsId });
        const body = doc.data.body?.content || [];
        body.forEach(elem => {
          if (elem.paragraph) {
            let t = '';
            elem.paragraph.elements?.forEach(el => { if (el.textRun?.content) t += el.textRun.content; });
            const clean = t.replace(/\n/g, '').trim();
            if (clean) paragraphs.push(clean);
          }
        });
      } catch (e) {
        console.error('[DOCS]', e);
      }
      const pasalData = extractSemuaPasal(paragraphs);

      let savedData = null;
      try {
        const pubRows = await getSheetData('Poin Publik Kegiatan');
        const found   = pubRows.find(r => String(r[1]).trim() === idDokumen);
        if (found) {
          savedData = {
            statusPublikasi: String(found[5] || ''),
            tanggalKegiatan: String(found[6] || ''),
            tempatKegiatan:  String(found[7] || ''),
            poinDipilih:     JSON.parse(String(found[8] || '[]')),
            narasiKustom:    String(found[12] || ''),
            tanggalKegiatanSelesai: String(found[13] || ''),
          };
        }
      } catch {}

      return NextResponse.json({ dok, pasalData, savedData });
    }

    let publikMap: Record<string, any> = {};
    try {
      const pubRows = await getSheetData('Poin Publik Kegiatan');
      pubRows.forEach(r => {
        if (r[1]) publikMap[String(r[1])] = {
          statusPublikasi: String(r[5] || ''),
          tanggalKegiatan: String(r[6] || ''),
          tempatKegiatan:  String(r[7] || ''),
          narasiKustom:    String(r[12] || ''),
        };
      });
    } catch {}

    return NextResponse.json({
      dokumen: selesai.map(d => ({ ...d, publikasi: publikMap[d.id] || null }))
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: Simpan pilihan pasal untuk publik ────────────────
export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const {
      idDokumen, jenis, judul, namaMitra,
      statusPublikasi, tanggalKegiatan, tanggalKegiatanSelesai, tempatKegiatan,
      poinDipilih, dibuatOleh, narasiKustom,
    } = await req.json();

    if (!idDokumen || !poinDipilih || !statusPublikasi) {
      return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
    }

    // Ambil tanggal kegiatan dari dokumen asli (kalau ada) — SAMA seperti
    // prioritas yang dipakai /api/beranda & /api/kelola-kegiatan — supaya
    // pesan sukses di sini akurat menyebutkan tab tempat kegiatan ini
    // akan benar-benar muncul, bukan cuma dugaan.
    let tglMulaiDok = '', tglSelesaiDok = '';
    try {
      const dokRows = await getSheetData('Dokumen Kerja sama');
      const dokRow = dokRows.find(r => String(r[COL_DOK.ID] || '').trim() === idDokumen);
      if (dokRow) {
        tglMulaiDok   = String(dokRow[COL_DOK.TGL_KEG_MULAI] || '');
        tglSelesaiDok = String(dokRow[COL_DOK.TGL_KEG_SELESAI] || '');
      }
    } catch {}

    const bucket = hitungBucket(tglMulaiDok || tanggalKegiatan || '', tglSelesaiDok, statusPublikasi);
    const labelBucket: Record<string, string> = {
      'akan-berlangsung': 'Akan Berlangsung', 'berlangsung': 'Sedang Berlangsung', 'telah-berlangsung': 'Telah Berlangsung',
    };
    const catatanTampil = `Akan muncul di tab "${labelBucket[bucket] || bucket}" pada halaman Beranda publik dan Kelola Kegiatan.`;

    try {
      const pubRows = await getSheetData('Poin Publik Kegiatan');
      const idx     = pubRows.findIndex(r => String(r[1]).trim() === idDokumen);
      if (idx !== -1) {
        const rowNum = idx + 2;
        await updateCell('Poin Publik Kegiatan', rowNum, 6,  statusPublikasi);
        await updateCell('Poin Publik Kegiatan', rowNum, 7,  tanggalKegiatan || '');
        await updateCell('Poin Publik Kegiatan', rowNum, 8,  tempatKegiatan  || '');
        await updateCell('Poin Publik Kegiatan', rowNum, 9,  JSON.stringify(poinDipilih));
        await updateCell('Poin Publik Kegiatan', rowNum, 13, narasiKustom || '');
        await updateCell('Poin Publik Kegiatan', rowNum, 14, tanggalKegiatanSelesai || tglSelesaiDok || '');
        return NextResponse.json({ message: 'Poin publik berhasil diperbarui.', bucket, catatanTampil });
      }
    } catch {}

    await appendRow('Poin Publik Kegiatan', [
      generateId('PPK'),
      idDokumen, jenis, judul, namaMitra,
      statusPublikasi,
      tanggalKegiatan || '',
      tempatKegiatan  || '',
      JSON.stringify(poinDipilih),
      formatTanggalWaktu(new Date()),
      dibuatOleh || 'Admin',
      '',
      narasiKustom || '',
      tanggalKegiatanSelesai || tglSelesaiDok || '', // kolom BARU index 13 — tanggal selesai kegiatan (durasi)
    ]);

    return NextResponse.json({ message: 'Poin publik berhasil disimpan.', bucket, catatanTampil });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: Hapus dari publik ──────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { idDokumen } = await req.json();
    const pubRows = await getSheetData('Poin Publik Kegiatan');
    const idx     = pubRows.findIndex(r => String(r[1]).trim() === idDokumen);
    if (idx === -1) return NextResponse.json({ message: 'Data tidak ditemukan.' }, { status: 404 });

    await updateCell('Poin Publik Kegiatan', idx + 2, 6, '');
    await updateCell('Poin Publik Kegiatan', idx + 2, 9, '[]');
    return NextResponse.json({ message: 'Poin berhasil dihapus dari publik.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}