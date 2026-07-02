import { NextRequest, NextResponse } from 'next/server';
import { appendRow, getSheetData, findRow, updateCell, deleteRow } from '@/lib/sheet';
import { generateId, generateKodeAkses, formatTanggal, formatTanggalWaktu } from '@/lib/utils';
import { buatDariTemplate, hapusDariDrive } from '@/lib/gdocs';

// Kolom "Dokumen Kerja sama" (0-based)
const COL = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_DIBUAT:5,
  TGL_BERLAKU:6, TGL_BERAKHIR:7, DURASI:8, STATUS:9, KODE:10,
  KODE_EXP:11, DOCS_ID:12, DOCS_URL:13, FOLDER_ID:14,
  DIBUAT_OLEH:15, CATATAN:16,
  DIVISI:23, // sudah ada dari desain awal sheet — dipakai utk tampilan, TIDAK ditulis appendRow di sini
};

// ── POST: Generate kode + buat Docs + Drive via Apps Script ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tipeKode, idMitra, namaMitra, namaPIC, jabatanPIC,
      jenis, judul, durasiTahun, dibuatOleh,
      templateMitraId, divisi, // ← divisi: array dari Pengajuan, dibawa ke dokumen
    } = body;

    if (!namaMitra?.trim() || !jenis || !['MOU','PKS'].includes(jenis)) {
      return NextResponse.json({ message: 'Nama mitra dan jenis wajib diisi.' }, { status: 400 });
    }

    const now = new Date();

    // ══ TIPE 1: Kode Status (tanpa Docs/Drive) ════════════
    if (tipeKode === 'status') {
      const kode       = generateKodeAkses('KS');
      const kodeExpire = new Date(now);
      kodeExpire.setMonth(kodeExpire.getMonth() + 1);

      await appendRow('Kode Status Kerja Sama', [
        generateId('KS'), idMitra || '', namaMitra.trim(), jenis,
        kode, formatTanggalWaktu(now), formatTanggalWaktu(kodeExpire),
        'Aktif', dibuatOleh || 'Superadmin',
      ]);

      return NextResponse.json({
        tipeKode: 'status', kode,
        kodeExpire: formatTanggalWaktu(kodeExpire),
        berlaku: '1 bulan',
        message: 'Kode status kerja sama berhasil dibuat.',
      });
    }

    // ══ TIPE 2: Kode Dokumen + Google Docs + Drive ═════════
    if (tipeKode === 'dokumen') {
      if (!judul?.trim()) {
        return NextResponse.json({ message: 'Judul dokumen wajib diisi.' }, { status: 400 });
      }

      const durasi      = Math.max(5, parseInt(String(durasiTahun || 5)));
      const idDokumen   = generateId(jenis);
      const kodeAkses   = generateKodeAkses(jenis);
      const kodeExpire  = new Date(now);
      kodeExpire.setDate(kodeExpire.getDate() + 30); // 30 hari fase draft

      const tglBerlaku  = formatTanggal(now);
      const tglBerakhir = (() => {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() + durasi);
        return formatTanggal(d);
      })();

      // Panggil Apps Script — buat folder + Docs sekaligus
      // FIX 2: Hanya kirim templateMitraId jika ada nilainya
      const { docsId, docsUrl, folderId, fotoFolderId } = await buatDariTemplate({
        jenis:           jenis as 'MOU' | 'PKS',
        idDokumen,
        idMitra:         idMitra || idDokumen,
        namaMitra:       namaMitra.trim(),
        namaPIC:         namaPIC || '',
        jabatanPIC:      jabatanPIC || '',
        perihal:         judul.trim(),
        tanggalBerlaku:  tglBerlaku,
        tanggalBerakhir: tglBerakhir,
        durasiTahun:     durasi,
        kodeAkses,
        ...(templateMitraId ? { templateMitraId } : {}), // ← FIX 2: Conditional spread
      });

      const divisiArr: string[] = Array.isArray(divisi) ? divisi.filter(Boolean) : (divisi ? [divisi] : []);
      const divisiStr = divisiArr.join(',');

      // Simpan ke Sheets — kolom 19-22 sengaja dikosongkan (diisi flow lain belakangan:
      // template mitra, tanggal kegiatan, PDF), divisi di kolom 23 dibawa dari Pengajuan.
      await appendRow('Dokumen Kerja sama', [
        idDokumen, jenis, judul.trim(),
        idMitra || '', namaMitra.trim(),
        formatTanggalWaktu(now),
        tglBerlaku, tglBerakhir, durasi,
        'Draft', kodeAkses,
        formatTanggalWaktu(kodeExpire),
        docsId, docsUrl, folderId,
        dibuatOleh || 'Superadmin', '',
        '', fotoFolderId,
        '', '', '', '', // 19 TemplateMitraID, 20 TglKegMulai, 21 TglKegSelesai, 22 PDFDriveID
        divisiStr,       // 23 Divisi
      ]);

      return NextResponse.json({
        tipeKode: 'dokumen',
        idDokumen, kodeAkses,
        kodeExpire: formatTanggalWaktu(kodeExpire),
        tglBerlaku, tglBerakhir, durasi,
        berlaku: `${durasi} tahun`,
        docsId, docsUrl,
        message: 'Dokumen berhasil dibuat di Google Docs.',
      });
    }

    return NextResponse.json({ message: 'tipeKode tidak valid.' }, { status: 400 });
  } catch (err) {
    console.error('[GENERATE KODE]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: List semua dokumen ────────────────────────────────
export async function GET() {
  try {
    const rows = await getSheetData('Dokumen Kerja sama');
    const data = rows.filter(r => r[COL.ID]).map(r => ({
      id:          r[COL.ID],
      jenis:       r[COL.JENIS],
      judul:       r[COL.JUDUL],
      namaMitra:   r[COL.NAMA_MITRA],
      tglDibuat:   r[COL.TGL_DIBUAT],
      tglBerlaku:  r[COL.TGL_BERLAKU],
      tglBerakhir: r[COL.TGL_BERAKHIR],
      durasi:      r[COL.DURASI],
      status:      r[COL.STATUS],
      kode:        r[COL.KODE],
      kodeExpire:  r[COL.KODE_EXP],
      docsId:      r[COL.DOCS_ID],
      docsUrl:     r[COL.DOCS_URL],
      folderId:    r[COL.FOLDER_ID],
      dibuatOleh:  r[COL.DIBUAT_OLEH],
      catatan:     String(r[COL.CATATAN] || ''),
      divisi:      String(r[COL.DIVISI] || '').split(',').map(s => s.trim()).filter(Boolean),
    })).reverse();
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: Hapus dokumen dari Sheets + Docs + Drive ───────
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });

    const found = await findRow('Dokumen Kerja sama', COL.ID, id);
    if (!found) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const docsId   = String(found.data[COL.DOCS_ID] || '');
    const folderId = String(found.data[COL.FOLDER_ID] || '');

    // Coba hapus dari Drive (best-effort, Service Account mungkin tidak punya akses
    // karena bukan owner — kalau gagal tetap lanjut hapus dari Sheets)
    if (docsId)   await hapusDariDrive(docsId);
    if (folderId) await hapusDariDrive(folderId);

    await deleteRow('Dokumen Kerja sama', found.rowNumber);

    return NextResponse.json({ message: 'Dokumen berhasil dihapus dari Sheets. (Docs/Drive mungkin perlu dihapus manual jika Service Account bukan owner)' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: Edit judul / status dokumen ────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { id, fields } = await req.json();
    if (!id || !fields) return NextResponse.json({ message: 'ID dan fields wajib.' }, { status: 400 });

    const found = await findRow('Dokumen Kerja sama', COL.ID, id);
    if (!found) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const map: Record<string, number> = {
      judul:       COL.JUDUL + 1,
      status:      COL.STATUS + 1,
      catatan:     COL.CATATAN + 1,
      tglBerlaku:  COL.TGL_BERLAKU + 1,
      tglBerakhir: COL.TGL_BERAKHIR + 1,
      divisi:      COL.DIVISI + 1,
    };

    for (const [key, val] of Object.entries(fields)) {
      const col = map[key];
      if (!col) continue;
      const v = key === 'divisi' && Array.isArray(val) ? val.join(',') : (val as string);
      await updateCell('Dokumen Kerja sama', found.rowNumber, col, v);
    }

    return NextResponse.json({ message: 'Dokumen berhasil diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}