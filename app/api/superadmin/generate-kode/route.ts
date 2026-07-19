import { NextRequest, NextResponse } from 'next/server';
import { appendRow, getSheetData, findRow, updateCell, deleteRow } from '@/lib/sheet';
import { generateId, generateKodeAkses, formatTanggal, formatTanggalWaktu } from '@/lib/utils';
import { buatDariTemplate, hapusDariDrive } from '@/lib/gdocs';
import { requireSession } from '@/lib/auth';

// Kolom "Dokumen Kerja sama" (0-based)
const COL = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_DIBUAT:5,
  TGL_BERLAKU:6, TGL_BERAKHIR:7, DURASI:8, STATUS:9, KODE:10,
  KODE_EXP:11, DOCS_ID:12, DOCS_URL:13, FOLDER_ID:14,
  DIBUAT_OLEH:15, CATATAN:16,
  DIVISI:23, // sudah ada dari desain awal sheet — dipakai utk tampilan, TIDAK ditulis appendRow di sini
  LOG_EDIT:30, // sama seperti di dokumen-id-route.ts — siapa terakhir edit, format "role|nama|waktu"
  // (index 29 SUDAH DIPAKAI di Kode.gs untuk "Milestone Diingatkan" — jangan pakai ulang!)
  FLAG_REVISI:33, // BARU — flag "perlu revisi" dari BNN Utama, format "ya|waktu"
};

// ── POST: Generate kode + buat Docs + Drive via Apps Script ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tipeKode, idMitra, namaMitra, namaPIC, jabatanPIC,
      jenis, judul, dibuatOleh, jurusan,
      tglBerlaku: tglBerlakuInput, tglBerakhir: tglBerakhirInput,
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

      if (!tglBerlakuInput) {
        return NextResponse.json({ message: 'Tanggal mulai (Acc) wajib diisi.' }, { status: 400 });
      }
      const tglMulaiDate = new Date(tglBerlakuInput);
      if (isNaN(tglMulaiDate.getTime())) {
        return NextResponse.json({ message: 'Format tanggal mulai tidak valid.' }, { status: 400 });
      }

      // Tanggal berakhir OPSIONAL saat generate — bisa dikosongkan dulu dan
      // diisi admin belakangan lewat halaman detail dokumen.
      let tglAkhirDate: Date | null = null;
      if (tglBerakhirInput) {
        tglAkhirDate = new Date(tglBerakhirInput);
        if (isNaN(tglAkhirDate.getTime())) {
          return NextResponse.json({ message: 'Format tanggal berakhir tidak valid.' }, { status: 400 });
        }
        if (tglAkhirDate <= tglMulaiDate) {
          return NextResponse.json({ message: 'Tanggal berakhir harus setelah tanggal mulai.' }, { status: 400 });
        }
      }
      // Durasi (tahun) dihitung otomatis dari rentang tanggal kalau ada — cuma untuk catatan/tampilan
      const durasi = tglAkhirDate
        ? Math.max(1, Math.round((tglAkhirDate.getTime() - tglMulaiDate.getTime()) / (1000 * 60 * 60 * 24 * 365)))
        : 0;

      const idDokumen   = generateId(jenis);
      const kodeAkses   = generateKodeAkses(jenis);
      const kodeExpire  = new Date(now);
      kodeExpire.setDate(kodeExpire.getDate() + 30); // 30 hari fase draft

      const tglBerlaku  = formatTanggal(tglMulaiDate);
      const tglBerakhir = tglAkhirDate ? formatTanggal(tglAkhirDate) : '';

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
        ...(jenis === 'PKS' && jurusan ? { jurusan } : {}),
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

      // Catat siapa yang generate dokumen ini sebagai log edit pertama — biar
      // EditPencilIndicator langsung kelihatan begitu dokumen jadi, bukan cuma
      // muncul setelah ada PATCH edit belakangan.
      const rowBaru = await findRow('Dokumen Kerja sama', COL.ID, idDokumen);
      if (rowBaru) {
        await updateCell('Dokumen Kerja sama', rowBaru.rowNumber, COL.LOG_EDIT + 1, `admin|${dibuatOleh || 'Superadmin'}|${formatTanggalWaktu(now)}|bnnp_bnnk`);
      }

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
      manualLog:   String(r[COL.LOG_EDIT] || ''),
      flagRevisi:  String(r[COL.FLAG_REVISI] || '').startsWith('ya'),
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

// Catat aktivitas ke Komentar Revisi (tab "Log Aktivitas") — sama polanya
// dengan yang ada di dokumen-id-route.ts, diduplikasi di sini karena helper
// itu bersifat lokal (tidak diexport dari file lain).
// Resolve email PIC mitra dari Pengajuan Mitra — sama seperti di dokumen-id-route.ts
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

// ── PATCH: Edit judul / status dokumen ────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { id, fields, pelaku: pelakuBody, namaPelaku: namaPelakuBody } = await req.json();
    if (!id || !fields) return NextResponse.json({ message: 'ID dan fields wajib.' }, { status: 400 });

    const found = await findRow('Dokumen Kerja sama', COL.ID, id);
    if (!found) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    // Resolve identitas dari session (server), bukan dari body client — lihat
    // penjelasan lengkap di dokumen-id-route.ts.
    let pelaku = String(pelakuBody || 'admin');
    let namaPelaku = String(namaPelakuBody || '');
    let levelPelaku = '';
    try {
      const session = await requireSession(req);
      const idMitraRow = String(found.data[COL.ID_MITRA] || '');
      const namaMitraRow = String(found.data[COL.NAMA_MITRA] || '');
      if (session?.role === 'mitra') {
        // Sama seperti di dokumen-id-route.ts: mitra cuma boleh PATCH dokumennya sendiri.
        if (String(session.idDokumen || '') !== id) {
          return NextResponse.json({ message: 'Anda tidak memiliki akses untuk mengubah dokumen ini.' }, { status: 403 });
        }
        pelaku = 'mitra';
        const picEmail = await resolvePicEmail(idMitraRow, namaMitraRow);
        namaPelaku = picEmail || namaPelakuBody || namaMitraRow || 'Mitra';
      } else if (session && ['admin', 'superadmin'].includes(String(session.role))) {
        pelaku = 'admin';
        const s = session as Record<string, unknown>;
        namaPelaku = String(s.email || s.username || s.nama || namaPelakuBody || 'Admin');
        levelPelaku = String(s.level || '') === 'utama' ? 'utama' : 'bnnp_bnnk';
      }
    } catch { /* fallback ke nilai dari body */ }

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

    // Catat siapa (+role, +level) terakhir mengubah — dipakai EditPencilIndicator di dashboard admin
    const role = pelaku === 'mitra' ? 'mitra' : 'admin';
    const nama = String(namaPelaku || (role === 'mitra' ? 'Mitra' : 'Admin')).trim();
    const levelStr = role === 'admin' ? (levelPelaku === 'utama' ? 'utama' : 'bnnp_bnnk') : '';
    await updateCell('Dokumen Kerja sama', found.rowNumber, COL.LOG_EDIT + 1, `${role}|${nama}|${formatTanggalWaktu(new Date())}|${levelStr}`);

    // Log Aktivitas — sebutkan field spesifik yang diubah
    const fieldLabel: Record<string, string> = {
      judul: 'judul dokumen', status: 'status', catatan: 'catatan',
      tglBerlaku: 'tanggal mulai berlaku', tglBerakhir: 'tanggal berakhir', divisi: 'divisi penanganan',
    };
    const perubahan = Object.keys(fields).map(k => fieldLabel[k] || k).filter(Boolean);
    if (perubahan.length > 0) {
      await catatKomentarSistem(id, `✎ ${nama} mengubah ${perubahan.join(', ')}.`);
    }

    return NextResponse.json({ message: 'Dokumen berhasil diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}