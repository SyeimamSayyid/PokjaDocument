import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, findRow, updateCell } from '@/lib/sheet';
import { generateId, generateKodeAkses, formatTanggalWaktu } from '@/lib/utils';

const SHEET_DAFTAR   = 'Pendaftaran Kegiatan';
const SHEET_KEGIATAN = 'Kegiatan Eplanning';

const COL_D = {
  ID:0, ID_KEGIATAN:1, JUDUL_KEG:2, JENIS:3, NAMA_INST:4, JURUSAN:5,
  EMAIL:6, WA:7, DESKRIPSI:8, KODE:9, STATUS:10, ALASAN_TOLAK:11,
  ID_DOKUMEN:12, TGL_DAFTAR:13, CATATAN:14,
  NAMA_PIC:15, FILE_ID:16, FILE_NAMA:17, // BARU — non-breaking, ditaruh di akhir
};

const COL_K = {
  ID:0, KATEGORI:1, DIVISI:2, JUDUL:3, DESKRIPSI:4, JENIS:5,
  TARGET:6, TERISI:7, WILAYAH:8, BIAYA:9, TGL_MULAI:10, TGL_TARGET:11,
  STATUS:12, TAMPIL_PUBLIK:13, TGL_DITETAPKAN:17, TGL_BERAKHIR_MOU:18,
};

// ── POST: Mitra daftar slot kegiatan (kuota -1) ───────────
export async function POST(req: NextRequest) {
  try {
    const { idKegiatan, namaInstitusi, namaPIC, jurusan, email, noWa, deskripsi, fileDokumenId, fileDokumenNama } = await req.json();

    if (!idKegiatan || !namaInstitusi?.trim()) {
      return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
    }
    if (!namaPIC?.trim()) {
      return NextResponse.json({ message: 'Nama PIC wajib diisi.' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ message: 'Email wajib diisi.' }, { status: 400 });
    }
    if (!noWa?.trim()) {
      return NextResponse.json({ message: 'No. WhatsApp wajib diisi.' }, { status: 400 });
    }

    // Cek kegiatan & kuota
    const found = await findRow(SHEET_KEGIATAN, COL_K.ID, idKegiatan);
    if (!found) return NextResponse.json({ message: 'Kegiatan tidak ditemukan.' }, { status: 404 });

    const target = parseInt(String(found.data[COL_K.TARGET] || '0')) || 0;
    const terisi = parseInt(String(found.data[COL_K.TERISI] || '0')) || 0;
    const statusKeg = String(found.data[COL_K.STATUS]);
    const tampilPublik = String(found.data[COL_K.TAMPIL_PUBLIK]) === 'Ya';

    if (!tampilPublik) {
      return NextResponse.json({ message: 'Kegiatan ini tidak menerima pendaftaran.' }, { status: 403 });
    }
    if (statusKeg === 'Ditutup' || statusKeg === 'Selesai') {
      return NextResponse.json({ message: 'Pendaftaran kegiatan ini sudah ditutup.' }, { status: 403 });
    }
    if (terisi >= target) {
      return NextResponse.json({ message: 'Kuota kegiatan sudah penuh.' }, { status: 403 });
    }

    const jenis = String(found.data[COL_K.JENIS]); // dikunci dari kegiatan
    const judulKeg = String(found.data[COL_K.JUDUL]);

    // Buat pendaftaran
    const id   = generateId('PDF');
    const kode = generateKodeAkses('PD');

    await appendRow(SHEET_DAFTAR, [
      id, idKegiatan, judulKeg, jenis,
      namaInstitusi.trim(), jurusan || '',
      email.trim(), noWa.trim(), deskripsi || '',
      kode, 'Diajukan', '', '',
      formatTanggalWaktu(new Date()), '',
      namaPIC.trim(), fileDokumenId || '', fileDokumenNama || '',
    ]);

    // Kuota +1 terisi
    const terisiBaru = terisi + 1;
    await updateCell(SHEET_KEGIATAN, found.rowNumber, COL_K.TERISI + 1, String(terisiBaru));

    // Update status kegiatan jika penuh
    if (terisiBaru >= target) {
      await updateCell(SHEET_KEGIATAN, found.rowNumber, COL_K.STATUS + 1, 'Penuh');
    } else if (statusKeg === 'Rencana') {
      await updateCell(SHEET_KEGIATAN, found.rowNumber, COL_K.STATUS + 1, 'Dibuka');
    }

    return NextResponse.json({
      message: 'Pendaftaran berhasil!',
      kodeTracking: kode,
      jenis,
      judulKegiatan: judulKeg,
      namaInstitusi: namaInstitusi.trim(),
      sisaKuota: target - terisiBaru,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: Admin acc/tolak pendaftaran ────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { id, statusBaru, catatan, idDokumen } = await req.json();

    const found = await findRow(SHEET_DAFTAR, COL_D.ID, id);
    if (!found) return NextResponse.json({ message: 'Pendaftaran tidak ditemukan.' }, { status: 404 });

    const statusLama = String(found.data[COL_D.STATUS]);
    const idKegiatan = String(found.data[COL_D.ID_KEGIATAN]);

    // Update status pendaftaran
    if (statusBaru) {
      await updateCell(SHEET_DAFTAR, found.rowNumber, COL_D.STATUS + 1, statusBaru);
    }
    if (catatan !== undefined) {
      await updateCell(SHEET_DAFTAR, found.rowNumber, COL_D.ALASAN_TOLAK + 1, catatan);
    }
    if (idDokumen) {
      await updateCell(SHEET_DAFTAR, found.rowNumber, COL_D.ID_DOKUMEN + 1, idDokumen);
    }

    // Jika DITOLAK → kuota balik (terisi -1)
    if (statusBaru === 'Ditolak' && statusLama !== 'Ditolak') {
      const keg = await findRow(SHEET_KEGIATAN, COL_K.ID, idKegiatan);
      if (keg) {
        const terisi = parseInt(String(keg.data[COL_K.TERISI] || '0')) || 0;
        const terisiBaru = Math.max(0, terisi - 1);
        await updateCell(SHEET_KEGIATAN, keg.rowNumber, COL_K.TERISI + 1, String(terisiBaru));

        // Kalau tadinya penuh, buka lagi
        const statusKeg = String(keg.data[COL_K.STATUS]);
        if (statusKeg === 'Penuh') {
          await updateCell(SHEET_KEGIATAN, keg.rowNumber, COL_K.STATUS + 1, 'Dibuka');
        }
      }
    }

    return NextResponse.json({ message: 'Status pendaftaran diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: List pendaftaran (admin) atau cek by kode (publik) ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kode        = searchParams.get('kode');
    const idKegiatan  = searchParams.get('idKegiatan');

    const rows = await getSheetData(SHEET_DAFTAR);

    // Cek status publik by kode tracking
    if (kode) {
      const row = rows.find(r => String(r[COL_D.KODE]).trim().toUpperCase() === kode.trim().toUpperCase());
      if (!row) return NextResponse.json({ ditemukan: false, message: 'Kode tidak ditemukan.' }, { status: 404 });
      return NextResponse.json({
        ditemukan:     true,
        idPendaftaran: String(row[COL_D.ID]),
        judulKegiatan: String(row[COL_D.JUDUL_KEG]),
        jenis:         String(row[COL_D.JENIS]),
        namaInstitusi: String(row[COL_D.NAMA_INST]),
        namaPIC:       String(row[COL_D.NAMA_PIC] || ''),
        jurusan:       String(row[COL_D.JURUSAN] || ''),
        status:        String(row[COL_D.STATUS]),
        catatan:       String(row[COL_D.ALASAN_TOLAK] || ''),
        tglDaftar:     String(row[COL_D.TGL_DAFTAR]),
      });
    }

    // List semua (admin)
    // Join dengan "Kegiatan Eplanning" — supaya admin lihat masa berlaku
    // MOU/PKS yang sudah ditetapkan di rencana, tanpa perlu isi ulang manual
    // saat generate dokumen (masa berlaku dikunci ikut rencana).
    let kegiatanMap: Record<string, { tglDitetapkan: string; tglBerakhirMou: string }> = {};
    try {
      const kegRows = await getSheetData(SHEET_KEGIATAN);
      kegRows.forEach(r => {
        if (r[COL_K.ID]) kegiatanMap[String(r[COL_K.ID])] = {
          tglDitetapkan: String(r[COL_K.TGL_DITETAPKAN] || ''),
          tglBerakhirMou: String(r[COL_K.TGL_BERAKHIR_MOU] || ''),
        };
      });
    } catch {}

    let data = rows.filter(r => r[COL_D.ID]).map(r => {
      const idKeg = String(r[COL_D.ID_KEGIATAN]);
      const keg = kegiatanMap[idKeg] || { tglDitetapkan: '', tglBerakhirMou: '' };
      return {
      id:            String(r[COL_D.ID]),
      idKegiatan:    idKeg,
      judulKegiatan: String(r[COL_D.JUDUL_KEG]),
      jenis:         String(r[COL_D.JENIS]),
      namaInstitusi: String(r[COL_D.NAMA_INST]),
      namaPIC:       String(r[COL_D.NAMA_PIC] || ''),
      jurusan:       String(r[COL_D.JURUSAN] || ''),
      email:         String(r[COL_D.EMAIL] || ''),
      noWa:          String(r[COL_D.WA] || ''),
      deskripsi:     String(r[COL_D.DESKRIPSI] || ''),
      kodeTracking:  String(r[COL_D.KODE]),
      status:        String(r[COL_D.STATUS]),
      catatan:       String(r[COL_D.ALASAN_TOLAK] || ''),
      idDokumen:     String(r[COL_D.ID_DOKUMEN] || ''),
      fileDokumenId:   String(r[COL_D.FILE_ID] || ''),
      fileDokumenNama: String(r[COL_D.FILE_NAMA] || ''),
      tglDaftar:     String(r[COL_D.TGL_DAFTAR]),
      // BARU — masa berlaku MOU/PKS dikunci dari rencana E-Planning
      tglDitetapkan:  keg.tglDitetapkan,
      tglBerakhirMou: keg.tglBerakhirMou,
      };
    }).reverse();

    if (idKegiatan) data = data.filter(d => d.idKegiatan === idKegiatan);

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}