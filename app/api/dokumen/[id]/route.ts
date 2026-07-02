import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell, appendRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { google } from 'googleapis';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

const COL = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_DIBUAT:5,
  TGL_BERLAKU:6, TGL_BERAKHIR:7, DURASI:8, STATUS:9, KODE:10,
  KODE_EXP:11, DOCS_ID:12, DOCS_URL:13, FOLDER_ID:14,
  DIBUAT_OLEH:15, CATATAN:16, TERAKHIR_DIAKSES:17, FOTO_FOLDER:18,
  TEMPLATE_MITRA:19, TGL_KEG_MULAI:20, TGL_KEG_SELESAI:21, PDF_ID:22,
  DIVISI:23, // sudah ada dari desain awal — JANGAN dipakai ulang untuk field lain
  // Penandatanganan (TTD) — digeser ke 24-28 supaya tidak bentrok dgn DIVISI (23)
  TTD_TIPE:24, TTD_TGL_DIAJUKAN:25, TTD_STATUS:26, TTD_TGL_FINAL:27, TTD_CATATAN:28,
};

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

async function kirimNotifikasi(idDokumen: string, tipe: string, judul: string, pesan: string) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buatNotifikasiManual', idDokumen, tipe, judul, pesan }),
    });
  } catch (e) { console.error('[NOTIF MITRA]', e); }
}

// Notifikasi ke kotak masuk ADMIN (bukan mitra) — dipakai utk kejadian yg mitra picu tapi perlu perhatian admin
async function kirimNotifikasiAdmin(idDokumen: string, tipe: string, judul: string, pesan: string) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buatNotifikasiAdminManual', idDokumen, tipe, judul, pesan }),
    });
  } catch (e) { console.error('[NOTIF ADMIN]', e); }
}

async function catatKomentarSistem(idDokumen: string, pesan: string) {
  try {
    await appendRow('Komentar Revisi', [
      generateId('KMT'), idDokumen, 'admin', 'sistem', 'Sistem',
      pesan, formatTanggalWaktu(new Date()), '',
    ]);
  } catch (e) { console.error('[KOMENTAR SISTEM]', e); }
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
      divisi:       String(row[COL.DIVISI] || '').split(',').map(s => s.trim()).filter(Boolean),
      // Penandatanganan
      ttdTipe:         String(row[COL.TTD_TIPE] || ''),
      ttdTglDiajukan:  String(row[COL.TTD_TGL_DIAJUKAN] || ''),
      ttdStatus:       String(row[COL.TTD_STATUS] || ''),
      ttdTglFinal:     String(row[COL.TTD_TGL_FINAL] || ''),
      ttdCatatan:      String(row[COL.TTD_CATATAN] || ''),
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

// ── PATCH: Update poin / status / tanggal kegiatan / TTD ───
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      poin, status, catatan, tglKegiatanMulai, tglKegiatanSelesai, transisi, alasanKembali,
      ttdAction, tglDiajukan, alasanTolak, tglFinal,
    } = body;

    const rows = await getSheetData('Dokumen Kerja sama');
    const idx  = rows.findIndex(r => String(r[COL.ID]).trim() === id.trim());
    if (idx === -1) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const rowNumber = idx + 2;
    const statusSkrg = String(rows[idx][COL.STATUS]).trim();
    const judulDok = String(rows[idx][COL.JUDUL] || '');

    // ── Alur Penandatanganan (TTD) ──────────────────────────
    if (ttdAction) {
      if (ttdAction === 'pilihBasah') {
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TIPE + 1, 'basah');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_STATUS + 1, 'Menunggu Basah');
        await kirimNotifikasiAdmin(id, 'ttd-basah', 'Mitra memilih TTD Basah',
          `Mitra memilih tanda tangan basah untuk dokumen "${judulDok}". Siapkan penerimaan dokumen fisik.`);
        await catatKomentarSistem(id, '✒ Mitra memilih metode TTD Basah. Menunggu dokumen fisik diterima admin.');
        return NextResponse.json({ message: 'TTD Basah dipilih. Admin telah diberi tahu.' });
      }

      if (ttdAction === 'ajukanOnline') {
        const tgl = String(tglDiajukan || '').trim();
        if (!tgl) return NextResponse.json({ message: 'Tanggal TTD wajib diisi.' }, { status: 400 });
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TIPE + 1, 'online');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TGL_DIAJUKAN + 1, tgl);
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_STATUS + 1, 'Menunggu Review');
        await kirimNotifikasiAdmin(id, 'ttd-online', 'Mitra mengajukan tanggal TTD Online',
          `Mitra mengajukan tanggal TTD Online (${tgl}) untuk dokumen "${judulDok}". Mohon ditinjau.`);
        await catatKomentarSistem(id, `✒ Mitra mengajukan TTD Online pada tanggal ${tgl}. Menunggu review admin.`);
        return NextResponse.json({ message: 'Tanggal TTD diajukan. Menunggu review admin.' });
      }

      if (ttdAction === 'setujuiOnline') {
        const tglAjuan = String(rows[idx][COL.TTD_TGL_DIAJUKAN] || '');
        if (!tglAjuan) return NextResponse.json({ message: 'Tidak ada tanggal yang diajukan.' }, { status: 400 });
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_STATUS + 1, 'Disetujui');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TGL_FINAL + 1, tglAjuan);
        await kirimNotifikasi(id, 'ttd-disetujui', 'Tanggal TTD disetujui',
          `Tanggal TTD Online (${tglAjuan}) untuk dokumen "${judulDok}" telah disetujui admin.`);
        await catatKomentarSistem(id, `✓ Tanggal TTD Online (${tglAjuan}) disetujui admin.`);
        return NextResponse.json({ message: 'Tanggal TTD disetujui.', ttdTglFinal: tglAjuan });
      }

      if (ttdAction === 'tolakOnline') {
        const alasan = String(alasanTolak || '').trim();
        if (!alasan) return NextResponse.json({ message: 'Alasan penolakan wajib diisi.' }, { status: 400 });
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_STATUS + 1, '');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TIPE + 1, '');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TGL_DIAJUKAN + 1, '');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_CATATAN + 1, alasan);
        await kirimNotifikasi(id, 'ttd-ditolak', 'Tanggal TTD ditolak',
          `Tanggal TTD Online untuk dokumen "${judulDok}" ditolak admin. Alasan: ${alasan}. Silakan ajukan ulang.`);
        await catatKomentarSistem(id, `✕ Tanggal TTD Online ditolak admin. Alasan: ${alasan}`);
        return NextResponse.json({ message: 'Tanggal TTD ditolak, mitra diminta ajukan ulang.' });
      }

      if (ttdAction === 'inputBasah') {
        const tgl = String(tglFinal || '').trim();
        if (!tgl) return NextResponse.json({ message: 'Tanggal TTD wajib diisi.' }, { status: 400 });
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_STATUS + 1, 'Disetujui');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TGL_FINAL + 1, tgl);
        await kirimNotifikasi(id, 'ttd-disetujui', 'Tanggal TTD Basah tercatat',
          `Dokumen fisik "${judulDok}" diterima. Tanggal TTD tercatat: ${tgl}.`);
        await catatKomentarSistem(id, `✓ Dokumen fisik diterima. Tanggal TTD Basah tercatat: ${tgl}.`);
        return NextResponse.json({ message: 'Tanggal TTD Basah tercatat.', ttdTglFinal: tgl });
      }

      return NextResponse.json({ message: 'Aksi TTD tidak dikenali.' }, { status: 400 });
    }

    // ── Transisi terkontrol (tombol mitra/admin) — validasi maju ──
    if (transisi) {
      const posSkrg = URUTAN_STATUS.indexOf(statusSkrg);
      const posBaru = URUTAN_STATUS.indexOf(transisi);
      const bolehMaju  = posBaru === posSkrg + 1;
      const bolehMundur = transisi === 'Draft' && statusSkrg === 'Dalam Proses';
      if (!bolehMaju && !bolehMundur) {
        return NextResponse.json({ message: `Transisi dari "${statusSkrg}" ke "${transisi}" tidak diizinkan.` }, { status: 400 });
      }

      const alasanBersih = String(alasanKembali || '').trim();
      if (transisi === 'Draft' && bolehMundur && !alasanBersih) {
        return NextResponse.json({ message: 'Alasan pengembalian ke Draft wajib diisi.' }, { status: 400 });
      }

      await updateCell('Dokumen Kerja sama', rowNumber, COL.STATUS + 1, transisi);

      if (transisi === 'Draft' && bolehMundur && alasanBersih) {
        await catatKomentarSistem(id, `↩ Dokumen dikembalikan ke Draft. Alasan: ${alasanBersih}`);
        await kirimNotifikasi(id, 'kembali-draft', 'Dokumen dikembalikan ke Draft',
          `Dokumen "${judulDok}" dikembalikan admin ke tahap Draft. Alasan: ${alasanBersih}`);
      }

      // Mitra klik "Selesai Mengisi" (Draft -> Dalam Proses) — beri tahu admin
      if (transisi === 'Dalam Proses' && statusSkrg === 'Draft') {
        await kirimNotifikasiAdmin(id, 'selesai-mengisi', 'Dokumen siap ditinjau',
          `Mitra telah selesai mengisi dokumen "${judulDok}" dan mengirimkannya untuk ditinjau.`);
      }

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