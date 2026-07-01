import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell } from '@/lib/sheet';
import { google } from 'googleapis';

const COL = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_DIBUAT:5,
  TGL_BERLAKU:6, TGL_BERAKHIR:7, DURASI:8, STATUS:9, KODE:10,
  KODE_EXP:11, DOCS_ID:12, DOCS_URL:13, FOLDER_ID:14,
  DIBUAT_OLEH:15, CATATAN:16, TERAKHIR_DIAKSES:17, FOTO_FOLDER:18,
  TEMPLATE_MITRA:19, TGL_KEG_MULAI:20, TGL_KEG_SELESAI:21, PDF_ID:22,
};

// Urutan status untuk validasi transisi maju
const URUTAN_STATUS = [
  'Draft','Dalam Proses','Selesai','Kegiatan Berlangsung',
  'Kegiatan Selesai','MOU/PKS Berlaku','Kedaluwarsa',
];

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
}

function toTitleCase(str: string): string {
  const kecil = ['dan','atau','di','ke','dari','yang','dengan','untuk','dalam','oleh','pada'];
  return str.toLowerCase().split(' ').map((w, i) =>
    i === 0 || !kecil.includes(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w
  ).join(' ');
}

function extractPoinDariParagraf(paragraphs: string[]): string[] {
  const poin: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) continue;
    const matchPasal = p.match(/^(?:PASAL|Pasal)\s+(\d+)$/i);
    if (!matchPasal) continue;
    const nomor = matchPasal[1];
    let judulDitemukan = '';
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      const prev = paragraphs[j].trim();
      if (!prev) continue;
      if (prev.match(/^(?:BAB|Bab)\s+/i)) continue;
      if (prev.match(/^(?:PASAL|Pasal)\s+\d+/i)) break;
      const isKandidat = prev.length >= 3 && prev.length <= 80 &&
        !prev.match(/^(Dalam|Yang|Untuk|Bahwa|Pada|Para|Pihak|Setiap|Apabila|Berdasarkan|Dengan|Nomor|Undang|Peraturan|Instruksi)/i) &&
        !prev.match(/^\d/) && !prev.match(/^[a-z]/);
      if (isKandidat) { judulDitemukan = prev; break; }
    }
    poin.push(judulDitemukan ? `Pasal ${nomor} — ${toTitleCase(judulDitemukan)}` : `Pasal ${nomor}`);
    if (poin.length >= 12) break;
  }
  return poin;
}

// ── GET: Detail dokumen ────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const extractPoin = searchParams.get('extractPoin') === 'true';

    const rows = await getSheetData('Dokumen Kerja sama');
    const row = rows.find(r => String(r[COL.ID]).trim() === id.trim());
    if (!row) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const docsId  = String(row[COL.DOCS_ID] || '');
    const docsUrl = String(row[COL.DOCS_URL] || '');
    const embedUrl = docsId ? `https://docs.google.com/document/d/${docsId}/preview` : '';
    const status = String(row[COL.STATUS]);
    const tglBerakhir = String(row[COL.TGL_BERAKHIR] || '');

    // Hitung sisa hari (untuk status MOU/PKS Berlaku)
    let sisaHari: number | null = null;
    if (status === 'MOU/PKS Berlaku' && tglBerakhir) {
      try {
        const diff = Math.ceil((new Date(tglBerakhir).getTime() - Date.now()) / (1000*60*60*24));
        sisaHari = diff;
      } catch {}
    }

    const dokumen = {
      id:           String(row[COL.ID]),
      jenis:        String(row[COL.JENIS]),
      judul:        String(row[COL.JUDUL]),
      namaMitra:    String(row[COL.NAMA_MITRA]),
      tglDibuat:    String(row[COL.TGL_DIBUAT]),
      tglBerlaku:   String(row[COL.TGL_BERLAKU]),
      tglBerakhir,
      durasi:       String(row[COL.DURASI]),
      status,
      kode:         String(row[COL.KODE]),
      kodeExpire:   String(row[COL.KODE_EXP]),
      docsId, docsUrl, embedUrl,
      folderId:     String(row[COL.FOLDER_ID] || ''),
      dibuatOleh:   String(row[COL.DIBUAT_OLEH] || ''),
      catatan:      String(row[COL.CATATAN] || ''),
      fotoFolderId: String(row[COL.FOTO_FOLDER] || ''),
      tglKegiatanMulai:   String(row[COL.TGL_KEG_MULAI] || ''),
      tglKegiatanSelesai: String(row[COL.TGL_KEG_SELESAI] || ''),
      pdfId:        String(row[COL.PDF_ID] || ''),
      sisaHari,
    };

    let poinOtomatis: string[] = [];
    if (extractPoin && docsId) {
      try {
        const auth = getAuth();
        const docs = google.docs({ version: 'v1', auth });
        const doc  = await docs.documents.get({ documentId: docsId });
        const body = doc.data.body?.content || [];
        const paragraphs: string[] = [];
        body.forEach(elem => {
          if (elem.paragraph) {
            let paraText = '';
            elem.paragraph.elements?.forEach(el => {
              if (el.textRun?.content) paraText += el.textRun.content;
            });
            const clean = paraText.replace(/\n/g, '').trim();
            if (clean) paragraphs.push(clean);
          }
        });
        poinOtomatis = extractPoinDariParagraf(paragraphs);
      } catch (e) {
        poinOtomatis = [];
      }
    }

    return NextResponse.json({ dokumen, poinOtomatis });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: Update poin / status / tanggal kegiatan ─────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { poin, status, catatan, tglKegiatanMulai, tglKegiatanSelesai, transisi } = await req.json();

    const rows = await getSheetData('Dokumen Kerja sama');
    const idx  = rows.findIndex(r => String(r[COL.ID]).trim() === id.trim());
    if (idx === -1) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const rowNumber = idx + 2;
    const statusSkrg = String(rows[idx][COL.STATUS]).trim();

    // Transisi terkontrol (tombol mitra/admin) — validasi maju
    if (transisi) {
      const posSkrg = URUTAN_STATUS.indexOf(statusSkrg);
      const posBaru = URUTAN_STATUS.indexOf(transisi);
      // Izinkan maju 1 langkah, atau mundur (admin kembalikan ke Draft)
      const bolehMaju  = posBaru === posSkrg + 1;
      const bolehMundur = transisi === 'Draft' && statusSkrg === 'Dalam Proses';
      if (!bolehMaju && !bolehMundur) {
        return NextResponse.json({ message: `Transisi dari "${statusSkrg}" ke "${transisi}" tidak diizinkan.` }, { status: 400 });
      }
      await updateCell('Dokumen Kerja sama', rowNumber, COL.STATUS + 1, transisi);
      return NextResponse.json({ message: 'Status diperbarui.', statusBaru: transisi });
    }

    // Edit status manual admin (bebas)
    if (status) {
      await updateCell('Dokumen Kerja sama', rowNumber, COL.STATUS + 1, status);
    }
    if (poin !== undefined) {
      await updateCell('Dokumen Kerja sama', rowNumber, COL.CATATAN + 1, '[POIN]:' + JSON.stringify(poin));
    }
    if (catatan !== undefined && poin === undefined) {
      await updateCell('Dokumen Kerja sama', rowNumber, COL.CATATAN + 1, catatan);
    }
    if (tglKegiatanMulai !== undefined) {
      await updateCell('Dokumen Kerja sama', rowNumber, COL.TGL_KEG_MULAI + 1, tglKegiatanMulai);
    }
    if (tglKegiatanSelesai !== undefined) {
      await updateCell('Dokumen Kerja sama', rowNumber, COL.TGL_KEG_SELESAI + 1, tglKegiatanSelesai);
    }

    return NextResponse.json({ message: 'Dokumen berhasil diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}