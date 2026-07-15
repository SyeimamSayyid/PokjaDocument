import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell, appendRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { google } from 'googleapis';
import { requireSession } from '@/lib/auth';

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
  LOG_EDIT:30, // BARU — siapa+role terakhir yang mengubah dokumen ini, format "role|nama|waktu"
  // (index 29 SUDAH DIPAKAI di Kode.gs untuk "Milestone Diingatkan" — jangan pakai ulang!)
  DOC_SNAPSHOT:31, // BARU — cuplikan teks dokumen terakhir kali dicek, dipakai buat deteksi diff perubahan
  SCAN_TTD:32, // BARU — file ID scan hasil TTD Basah yang diupload admin (lihat Kode-tambahan-ScanTTD.gs)
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

// Resolve email PIC mitra dari Pengajuan Mitra — replikasi logika di
// app/api/dokumen/pic/route.ts, dipakai di sini biar bisa dipanggil server-side
// tanpa perlu HTTP round-trip tambahan.
async function resolvePicEmail(idMitra: string, namaInstitusi: string): Promise<string> {
  try {
    const pj = await getSheetData('Pengajuan Mitra');
    const normNama = (s: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    let matches = idMitra ? pj.filter(r => String(r[1] || '').trim() === idMitra) : [];
    if (matches.length === 0 && namaInstitusi) {
      const target = normNama(namaInstitusi);
      matches = pj.filter(r => normNama(String(r[2] || '')) === target);
    }
    let email = '';
    for (const r of matches) {
      const e = String(r[7] || '').trim();
      if (e) email = e;
    }
    return email;
  } catch { return ''; }
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
// Deteksi kalau dokumen Google Docs diedit LANGSUNG (siapapun, tanpa login,
// via "siapa saja bisa edit") tanpa lewat aksi resmi di aplikasi. Dibanding
// waktu di Log Edit Terakhir yang tersimpan — kalau modifiedTime Drive lebih
// baru, berarti ada perubahan "anonim" yang belum tercatat. Dicatat sebagai
// role "unknown" (pensil abu-abu) + komentar sistem, TIDAK menimpa log kalau
// memang tidak ada perubahan baru (biar tidak nulis sheet sia-sia tiap load).
// Ambil seluruh teks polos dari Google Docs (gabungan semua paragraf)
async function ambilTeksDocs(docsId: string): Promise<string> {
  try {
    const auth = getAuth();
    const docs = google.docs({ version: 'v1', auth });
    const doc  = await docs.documents.get({ documentId: docsId });
    const body = doc.data.body?.content || [];
    let teks = '';
    body.forEach(elem => {
      if (elem.paragraph) {
        elem.paragraph.elements?.forEach(el => { if (el.textRun?.content) teks += el.textRun.content; });
      }
    });
    return teks;
  } catch (e) {
    console.error('[AMBIL TEKS DOCS]', e);
    return '';
  }
}

// Ringkas perubahan teks jadi "dari: ... menjadi: ..." pakai diff kata per kata.
// Wajib install dulu: npm install diff  (+ npm install --save-dev @types/diff)
async function ringkasPerubahanTeks(lama: string, baru: string): Promise<string> {
  if (!lama || !lama.trim()) return ''; // pertama kali dicek, belum ada pembanding — jangan tebak
  try {
    const { diffWords } = await import('diff');
    const changes = diffWords(lama, baru);
    const dihapus: string[] = [];
    const ditambah: string[] = [];
    changes.forEach(part => {
      if (part.removed && part.value.trim()) dihapus.push(part.value.trim());
      if (part.added && part.value.trim())   ditambah.push(part.value.trim());
    });
    if (dihapus.length === 0 && ditambah.length === 0) return '';
    const potong = (s: string, n = 150) => (s.length > n ? s.slice(0, n) + '…' : s);
    const bagian: string[] = [];
    if (dihapus.length)  bagian.push(`dari "${potong(dihapus.join(' … '))}"`);
    if (ditambah.length) bagian.push(`menjadi "${potong(ditambah.join(' … '))}"`);
    return bagian.join(' ');
  } catch (e) {
    console.error('[DIFF TEKS]', e);
    return '';
  }
}

async function cekEditDocsAnonim(idDokumen: string, rowNumber: number, docsId: string, logSaatIni: string, snapshotLama: string) {
  if (!docsId) return { logBaru: logSaatIni, snapshotBaru: snapshotLama };
  try {
    const auth  = getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const meta  = await drive.files.get({ fileId: docsId, fields: 'modifiedTime' });
    const modifiedTime = meta.data.modifiedTime ? new Date(meta.data.modifiedTime) : null;
    if (!modifiedTime) return { logBaru: logSaatIni, snapshotBaru: snapshotLama };

    const waktuLogSkrg = logSaatIni ? new Date(logSaatIni.split('|')[2] || '') : null;
    const adaPerubahanBaru = !waktuLogSkrg || isNaN(waktuLogSkrg.getTime()) || modifiedTime.getTime() > waktuLogSkrg.getTime() + 5000; // toleransi 5 detik

    if (!adaPerubahanBaru) return { logBaru: logSaatIni, snapshotBaru: snapshotLama };

    const waktuStr = formatTanggalWaktu(modifiedTime);
    const logBaru = `unknown|Anonim|${waktuStr}`;
    await updateCell('Dokumen Kerja sama', rowNumber, COL.LOG_EDIT + 1, logBaru);

    // Ambil teks terbaru, bandingkan sama snapshot terakhir buat tau APA yang berubah
    const teksBaru = await ambilTeksDocs(docsId);
    const ringkasan = await ringkasPerubahanTeks(snapshotLama, teksBaru);

    const pesanDasar = `✎ Dokumen diedit langsung melalui Google Docs (di luar aplikasi) pada ${waktuStr}.`;
    await catatKomentarSistem(idDokumen, ringkasan ? `${pesanDasar} Perubahan: ${ringkasan}` : pesanDasar);

    // Simpan snapshot baru buat pembanding berikutnya. Batasi ~45rb karakter,
    // aman di bawah limit sel Google Sheets (~50rb karakter).
    const snapshotBaru = teksBaru.length > 45000 ? teksBaru.slice(0, 45000) : teksBaru;
    await updateCell('Dokumen Kerja sama', rowNumber, COL.DOC_SNAPSHOT + 1, snapshotBaru);

    return { logBaru, snapshotBaru };
  } catch (e) {
    console.error('[CEK EDIT ANONIM]', e);
    return { logBaru: logSaatIni, snapshotBaru: snapshotLama };
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const extractPoin = searchParams.get('extractPoin') === 'true';

    const rows = await getSheetData('Dokumen Kerja sama');
    const rowIdx = rows.findIndex(r => String(r[COL.ID]).trim() === id.trim());
    if (rowIdx === -1) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });
    const row = rows[rowIdx];
    const rowNumber = rowIdx + 2;

    const docsId  = String(row[COL.DOCS_ID] || '');
    const docsUrl = String(row[COL.DOCS_URL] || '');
    const embedUrl = docsId ? `https://docs.google.com/document/d/${docsId}/preview` : '';
    const status = String(row[COL.STATUS]);
    const tglBerakhir = String(row[COL.TGL_BERAKHIR] || '');

    // Cek dulu apakah ada edit Docs langsung sejak log terakhir — kalau ada,
    // manualLog di bawah pakai hasil terbaru (bisa jadi "unknown|Anonim|...").
    const { logBaru: manualLog } = await cekEditDocsAnonim(id, rowNumber, docsId, String(row[COL.LOG_EDIT] || ''), String(row[COL.DOC_SNAPSHOT] || ''));

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
      manualLog,
      scanTtdId:  String(row[COL.SCAN_TTD] || ''),
      scanTtdUrl: row[COL.SCAN_TTD] ? `https://drive.google.com/file/d/${String(row[COL.SCAN_TTD])}/view` : '',
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

    // Cek apakah admin sudah mempublikasikan kegiatan ini lewat Extract Poin —
    // dipakai mitra buat gate fitur upload foto (baru boleh setelah dipublikasi).
    let sudahDipublikasi = false;
    try {
      const pubRows = await getSheetData('Poin Publik Kegiatan');
      const found = pubRows.find(r => String(r[1]).trim() === id && String(r[5] || '').trim());
      sudahDipublikasi = !!found;
    } catch { /* sheet belum ada isinya, anggap belum dipublikasi */ }

    return NextResponse.json({ dokumen: { ...dokumen, sudahDipublikasi }, poinOtomatis });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: Update poin / status / tanggal kegiatan / TTD ───
// Catat siapa (+role) yang terakhir mengubah dokumen — dipakai EditPencilIndicator
// di dashboard admin buat nunjukin pensil biru (admin) atau krem (mitra).
async function catatLogEdit(rowNumber: number, pelaku: string, namaPelaku: string) {
  const role = pelaku === 'mitra' ? 'mitra' : 'admin';
  const nama = String(namaPelaku || (role === 'mitra' ? 'Mitra' : 'Admin')).trim();
  await updateCell('Dokumen Kerja sama', rowNumber, COL.LOG_EDIT + 1, `${role}|${nama}|${formatTanggalWaktu(new Date())}`);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      poin, status, catatan, tglKegiatanMulai, tglKegiatanSelesai, transisi, alasanKembali,
      ttdAction, tglDiajukan, alasanTolak, tglFinal,
      pelaku: pelakuBody, namaPelaku: namaPelakuBody,
    } = body;

    const rows = await getSheetData('Dokumen Kerja sama');
    const idx  = rows.findIndex(r => String(r[COL.ID]).trim() === id.trim());
    if (idx === -1) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const rowNumber = idx + 2;
    const statusSkrg = String(rows[idx][COL.STATUS]).trim();
    const judulDok = String(rows[idx][COL.JUDUL] || '');
    const idMitraRow = String(rows[idx][COL.ID_MITRA] || '');
    const namaMitraRow = String(rows[idx][COL.NAMA_MITRA] || '');

    // ── Resolve identitas pelaku dari SESSION (server), bukan dari client ──
    // Client tinggal kirim apa pun, tapi kalau ada session valid, session yang
    // menang — mencegah orang klaim jadi admin/mitra lain lewat body request.
    // Admin/superadmin: pakai email dari session (field-nya bebas, jadi dicoba
    // beberapa nama field yang lazim). Mitra: pakai EMAIL PIC yang terdaftar di
    // Pengajuan Mitra (session mitra sendiri tidak menyimpan email personal,
    // cuma terikat ke dokumen), bukan nama institusi.
    let pelaku = String(pelakuBody || 'admin');
    let namaPelaku = String(namaPelakuBody || '');
    try {
      const session = await requireSession(req);
      if (session?.role === 'mitra') {
        // Kunci keamanan: mitra cuma boleh PATCH dokumen yang sesuai dengan
        // sesinya sendiri (session.idDokumen dari saat login pakai kode akses),
        // bukan sembarang id dari URL. Cegah mitra iseng ubah dokumen mitra lain.
        if (String(session.idDokumen || '') !== id.trim()) {
          return NextResponse.json({ message: 'Anda tidak memiliki akses untuk mengubah dokumen ini.' }, { status: 403 });
        }
        pelaku = 'mitra';
        const picEmail = await resolvePicEmail(idMitraRow, namaMitraRow);
        namaPelaku = picEmail || namaPelakuBody || namaMitraRow || 'Mitra';
      } else if (session && ['admin', 'superadmin'].includes(String(session.role))) {
        pelaku = 'admin';
        const s = session as Record<string, unknown>;
        namaPelaku = String(s.email || s.username || s.nama || namaPelakuBody || 'Admin');
      }
    } catch { /* fallback ke nilai dari body kalau session gagal diverifikasi */ }

    // ── Alur Penandatanganan (TTD) ──────────────────────────
    if (ttdAction) {
      if (ttdAction === 'pilihBasah') {
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TIPE + 1, 'basah');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_STATUS + 1, 'Menunggu Basah');
        await kirimNotifikasiAdmin(id, 'ttd-basah', 'Mitra memilih TTD Basah',
          `Mitra memilih tanda tangan basah untuk dokumen "${judulDok}". Siapkan penerimaan dokumen fisik.`);
        await catatKomentarSistem(id, `✒ ${namaPelaku || 'Mitra'} memilih metode TTD Basah. Menunggu dokumen fisik diterima admin.`);
        await catatLogEdit(rowNumber, pelaku, namaPelaku);
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
        await catatKomentarSistem(id, `✒ ${namaPelaku || 'Mitra'} mengajukan TTD Online pada tanggal ${tgl}. Menunggu review admin.`);
        await catatLogEdit(rowNumber, pelaku, namaPelaku);
        return NextResponse.json({ message: 'Tanggal TTD diajukan. Menunggu review admin.' });
      }

      if (ttdAction === 'setujuiOnline') {
        const tglAjuan = String(rows[idx][COL.TTD_TGL_DIAJUKAN] || '');
        if (!tglAjuan) return NextResponse.json({ message: 'Tidak ada tanggal yang diajukan.' }, { status: 400 });
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_STATUS + 1, 'Disetujui');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TGL_FINAL + 1, tglAjuan);
        await kirimNotifikasi(id, 'ttd-disetujui', 'Tanggal TTD disetujui',
          `Tanggal TTD Online (${tglAjuan}) untuk dokumen "${judulDok}" telah disetujui admin.`);
        await catatKomentarSistem(id, `✓ Tanggal TTD Online (${tglAjuan}) disetujui oleh ${namaPelaku || 'Admin'}.`);
        await catatLogEdit(rowNumber, pelaku, namaPelaku);
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
        await catatKomentarSistem(id, `✕ Tanggal TTD Online ditolak oleh ${namaPelaku || 'Admin'}. Alasan: ${alasan}`);
        await catatLogEdit(rowNumber, pelaku, namaPelaku);
        return NextResponse.json({ message: 'Tanggal TTD ditolak, mitra diminta ajukan ulang.' });
      }

      if (ttdAction === 'inputBasah') {
        const tgl = String(tglFinal || '').trim();
        if (!tgl) return NextResponse.json({ message: 'Tanggal TTD wajib diisi.' }, { status: 400 });
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_STATUS + 1, 'Disetujui');
        await updateCell('Dokumen Kerja sama', rowNumber, COL.TTD_TGL_FINAL + 1, tgl);
        await kirimNotifikasi(id, 'ttd-disetujui', 'Tanggal TTD Basah tercatat',
          `Dokumen fisik "${judulDok}" diterima. Tanggal TTD tercatat: ${tgl}.`);
        await catatKomentarSistem(id, `✓ Dokumen fisik diterima oleh ${namaPelaku || 'Admin'}. Tanggal TTD Basah tercatat: ${tgl}.`);
        await catatLogEdit(rowNumber, pelaku, namaPelaku);

        // "Bekukan" isi dokumen persis di momen ini — snapshot PDF terpisah dari
        // scan hasil TTD basah, kebal dari kemungkinan Docs-nya diedit lagi nanti.
        // Fire-and-forget: kalau gagal, tidak menggagalkan pencatatan tanggal TTD
        // (yang lebih penting), cukup dicatat di komentar sistem sebagai peringatan.
        try {
          const snapRes = await fetch(APPS_SCRIPT_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'arsipkanSnapshotTtd', idDokumen: id }),
            redirect: 'follow',
          });
          const snapD = await snapRes.json();
          if (snapD.success) {
            await catatKomentarSistem(id, `📎 Snapshot dokumen (isi persis saat TTD dicatat) otomatis diarsipkan.`);
          } else {
            await catatKomentarSistem(id, `⚠ Gagal mengarsipkan snapshot dokumen otomatis: ${snapD.message || 'error tidak diketahui'}.`);
          }
        } catch (e) {
          console.error('[SNAPSHOT TTD]', e);
        }

        return NextResponse.json({ message: 'Tanggal TTD Basah tercatat.', ttdTglFinal: tgl });
      }

      // Admin batalkan seluruh pemilihan TTD (basah/online) kalau salah klik —
      // kembalikan ke kondisi netral, mitra bisa pilih ulang dari awal.
      if (ttdAction === 'batalkan') {
        if (pelaku !== 'admin') {
          return NextResponse.json({ message: 'Hanya admin yang bisa membatalkan pemilihan TTD.' }, { status: 403 });
        }
        const tipeLama = String(rows[idx][COL.TTD_TIPE] || '');
        for (const col of [COL.TTD_TIPE, COL.TTD_TGL_DIAJUKAN, COL.TTD_STATUS, COL.TTD_TGL_FINAL, COL.TTD_CATATAN]) {
          await updateCell('Dokumen Kerja sama', rowNumber, col + 1, '');
        }
        await catatKomentarSistem(id, `↺ Pemilihan TTD ${tipeLama === 'basah' ? 'Basah' : 'Online'} dibatalkan oleh ${namaPelaku || 'Admin'}. Mitra dapat memilih ulang.`);
        await catatLogEdit(rowNumber, pelaku, namaPelaku);
        return NextResponse.json({ message: 'Pemilihan TTD berhasil dibatalkan.' });
      }

      // Admin hapus scan TTD Basah yang salah upload — cuma hapus REFERENSI di
      // sheet, file fisik di Drive dihapus terpisah lewat Apps Script (dipanggil
      // dari frontend sebelum manggil endpoint ini, lihat admin-dokumen-id-page.tsx).
      if (ttdAction === 'hapusScan') {
        if (pelaku !== 'admin') {
          return NextResponse.json({ message: 'Hanya admin yang bisa menghapus scan.' }, { status: 403 });
        }
        await updateCell('Dokumen Kerja sama', rowNumber, COL.SCAN_TTD + 1, '');
        await catatKomentarSistem(id, `🗑 Scan TTD Basah dihapus oleh ${namaPelaku || 'Admin'} (salah upload).`);
        await catatLogEdit(rowNumber, pelaku, namaPelaku);
        return NextResponse.json({ message: 'Scan berhasil dihapus.' });
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
        await catatKomentarSistem(id, `↩ Dokumen dikembalikan ke Draft oleh ${namaPelaku || (pelaku === 'mitra' ? 'Mitra' : 'Admin')}. Alasan: ${alasanBersih}`);
        await kirimNotifikasi(id, 'kembali-draft', 'Dokumen dikembalikan ke Draft',
          `Dokumen "${judulDok}" dikembalikan admin ke tahap Draft. Alasan: ${alasanBersih}`);
      } else if (bolehMaju) {
        await catatKomentarSistem(id, `→ Status diubah dari "${statusSkrg}" ke "${transisi}" oleh ${namaPelaku || (pelaku === 'mitra' ? 'Mitra' : 'Admin')}.`);
      }

      // Mitra klik "Selesai Mengisi" (Draft -> Dalam Proses) — beri tahu admin
      if (transisi === 'Dalam Proses' && statusSkrg === 'Draft') {
        await kirimNotifikasiAdmin(id, 'selesai-mengisi', 'Dokumen siap ditinjau',
          `Mitra telah selesai mengisi dokumen "${judulDok}" dan mengirimkannya untuk ditinjau.`);
      }

      await catatLogEdit(rowNumber, pelaku, namaPelaku);
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

    // Cuma catat log kalau memang ada field yang beneran diubah di blok generic ini
    if (status !== undefined || poin !== undefined || catatan !== undefined || tglKegiatanMulai !== undefined || tglKegiatanSelesai !== undefined) {
      await catatLogEdit(rowNumber, pelaku, namaPelaku);
      const pelakuLabel = namaPelaku || (pelaku === 'mitra' ? 'Mitra' : 'Admin');
      const perubahan: string[] = [];
      if (status !== undefined) perubahan.push(`status jadi "${status}"`);
      if (catatan !== undefined) perubahan.push('catatan');
      if (tglKegiatanMulai !== undefined || tglKegiatanSelesai !== undefined) perubahan.push('tanggal kegiatan');
      if (perubahan.length > 0) {
        await catatKomentarSistem(id, `✎ ${pelakuLabel} mengubah ${perubahan.join(', ')}.`);
      }
    }

    return NextResponse.json({ message: 'Dokumen berhasil diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}