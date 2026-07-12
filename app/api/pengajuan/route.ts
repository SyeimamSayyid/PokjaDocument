import { NextRequest, NextResponse } from 'next/server';
import { appendRow, getSheetData } from '@/lib/sheet';
import { generateId, generateKodeAkses, formatTanggalWaktu } from '@/lib/utils';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Kolom "Pengajuan Mitra" (0-based)
// 0  ID Pengajuan
// 1  ID Mitra
// 2  Nama Institusi
// 3  Jenis
// 4  Deskripsi
// 5  Tanggal Kegiatan
// 6  Biaya
// 7  Email
// 8  No WA
// 9  Status
// 10 Kode Tracking
// 11 Tanggal Submit
// 12 Catatan Admin
// 13 Jurusan/Prodi
// 14 File Dokumen ID
// 15 File Dokumen URL
// 16 Nama File Dokumen
// 17 Divisi
// 18 Nama PIC            ← BARU

// Submit form: maksimal 3 pengajuan per 10 menit per IP — cukup longgar untuk
// pemakaian wajar (orang mungkin submit ulang kalau salah isi), tapi menutup
// kemungkinan spam otomatis ratusan/ribuan entri sekaligus.
const POST_LIMIT = 3;
const POST_WINDOW_MS = 10 * 60 * 1000;

// Cek status: lebih longgar (orang wajar cuma cek sesekali), tapi tetap
// dibatasi supaya kode tracking (6 karakter) tidak bisa ditebak lewat brute force.
const GET_LIMIT = 15;
const GET_WINDOW_MS = 5 * 60 * 1000;

async function uploadDokumenMitra(params: {
  namaFile: string;
  base64Data: string;
  mimeType: string;
  namaInstitusi: string;
  jenis: string;
}): Promise<{ fileId: string; fileUrl: string; namaFile: string } | null> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'uploadDokumenMitra', ...params }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (!d.success) return null;
    return { fileId: d.fileId, fileUrl: d.fileUrl, namaFile: d.namaFile };
  } catch {
    return null;
  }
}

// ── POST: Submit form pengajuan publik ─────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitResult = checkRateLimit(`pengajuan-post:${ip}`, POST_LIMIT, POST_WINDOW_MS);

  if (!limitResult.allowed) {
    return NextResponse.json(
      { message: `Terlalu banyak pengajuan dikirim. Coba lagi dalam ${Math.ceil(limitResult.retryAfterSeconds / 60)} menit.` },
      { status: 429, headers: { 'Retry-After': String(limitResult.retryAfterSeconds) } }
    );
  }

  try {
    let fileData: { namaFile: string; base64Data: string; mimeType: string } | null = null;

    const raw = await req.json();
    const body: Record<string, string> = raw;
    if (raw.fileBase64 && raw.fileName && raw.fileMime) {
      fileData = {
        namaFile:  raw.fileName,
        base64Data: raw.fileBase64,
        mimeType:  raw.fileMime,
      };
    }

    const {
      namaInstitusi, idMitra, jenis, deskripsi,
      tanggalKegiatan, biaya, email, noWa, jurusan, namaPIC,
    } = body;

    // Validasi wajib
    if (!namaInstitusi?.trim()) {
      return NextResponse.json({ message: 'Nama institusi wajib diisi.' }, { status: 400 });
    }
    if (!jenis || !['MOU', 'PKS'].includes(jenis)) {
      return NextResponse.json({ message: 'Jenis kerja sama wajib dipilih.' }, { status: 400 });
    }
    if (!deskripsi?.trim()) {
      return NextResponse.json({ message: 'Deskripsi wajib diisi.' }, { status: 400 });
    }
    if (!namaPIC?.trim()) {
      return NextResponse.json({ message: 'Nama PIC (penanggung jawab) wajib diisi.' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ message: 'Email wajib diisi.' }, { status: 400 });
    }
    if (!noWa?.trim()) {
      return NextResponse.json({ message: 'No WhatsApp wajib diisi.' }, { status: 400 });
    }

    const now          = new Date();
    const idPengajuan  = generateId('PJN');
    const kodeTracking = generateKodeAkses('KS');
    const kodeExpire   = new Date(now);
    kodeExpire.setMonth(kodeExpire.getMonth() + 1);

    // Upload dokumen mitra jika ada
    let fileDokumenId  = '';
    let fileDokumenUrl = '';
    let fileDokumenNama = '';

    if (fileData) {
      const uploaded = await uploadDokumenMitra({
        ...fileData,
        namaInstitusi: namaInstitusi.trim(),
        jenis,
      });
      if (uploaded) {
        fileDokumenId   = uploaded.fileId;
        fileDokumenUrl  = uploaded.fileUrl;
        fileDokumenNama = uploaded.namaFile;
      }
    }

    // Simpan ke sheet "Pengajuan Mitra"
    // (kolom 17 Divisi dikosongkan dulu — diisi admin saat assign divisi)
    await appendRow('Pengajuan Mitra', [
      idPengajuan,
      idMitra || '',
      namaInstitusi.trim(),
      jenis,
      deskripsi.trim(),
      tanggalKegiatan || '',
      biaya || '',
      email.trim(),
      noWa.trim(),
      'Diajukan',
      kodeTracking,
      formatTanggalWaktu(now),
      '',                     // 12 catatan admin
      jurusan?.trim() || '',  // 13 jurusan/prodi (PKS)
      fileDokumenId,          // 14 ID file Drive
      fileDokumenUrl,         // 15 URL file Drive
      fileDokumenNama,        // 16 nama file
      '',                     // 17 Divisi (diisi admin)
      namaPIC.trim(),         // 18 Nama PIC
    ]);

    // Simpan ke "Kode Status Kerja Sama"
    await appendRow('Kode Status Kerja Sama', [
      generateId('KS'), idMitra || '', namaInstitusi.trim(), jenis,
      kodeTracking, formatTanggalWaktu(now), formatTanggalWaktu(kodeExpire),
      'Aktif', 'Sistem (Form Publik)',
    ]);

    return NextResponse.json({
      message: 'Pengajuan berhasil dikirim.',
      idPengajuan, kodeTracking,
      kodeExpire: formatTanggalWaktu(kodeExpire),
      namaInstitusi: namaInstitusi.trim(), jenis,
      adaDokumenMitra: !!fileDokumenId,
    });

  } catch (err) {
    console.error('[FORM PENGAJUAN]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: Cek status via kode tracking ─────────────────────
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const limitResult = checkRateLimit(`pengajuan-get:${ip}`, GET_LIMIT, GET_WINDOW_MS);

  if (!limitResult.allowed) {
    return NextResponse.json(
      { message: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(limitResult.retryAfterSeconds / 60)} menit.` },
      { status: 429, headers: { 'Retry-After': String(limitResult.retryAfterSeconds) } }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const kode = searchParams.get('kode')?.trim().toUpperCase();
    if (!kode) return NextResponse.json({ message: 'Kode wajib diisi.' }, { status: 400 });

    const rows  = await getSheetData('Pengajuan Mitra');
    const found = rows.find(r => String(r[10]).trim().toUpperCase() === kode);
    if (!found) return NextResponse.json({ message: 'Kode tidak ditemukan.' }, { status: 404 });

    const STATUS_INFO: Record<string, { color: string; bg: string; persen: number }> = {
      'Diajukan':            { color:'#0C447C', bg:'#E6F1FB', persen:14 },
      'Ditinjau':            { color:'#854F0B', bg:'#FAEEDA', persen:28 },
      'Disetujui':           { color:'#085041', bg:'#E1F5EE', persen:42 },
      'Dalam Proses':        { color:'#5B21B6', bg:'#EDE9FE', persen:57 },
      'Kegiatan Berlangsung':{ color:'#0F6E56', bg:'#D1FAE5', persen:85 },
      'Kegiatan Selesai':    { color:'#065F46', bg:'#A7F3D0', persen:100 },
      'Ditolak':             { color:'#A32D2D', bg:'#FCEBEB', persen:0 },
    };

    const status = String(found[9]);
    return NextResponse.json({
      ditemukan: true,
      idPengajuan: found[0], namaInstitusi: found[2], jenis: found[3],
      deskripsi: found[4], tanggalKegiatan: found[5], tglSubmit: found[11],
      jurusan: found[13] || '',
      namaPIC: found[18] || '',
      adaDokumenMitra: !!(found[14]),
      status, statusInfo: STATUS_INFO[status] || { color:'#6b7280', bg:'#f3f4f6', persen:0 },
      catatan: found[12] || '',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}