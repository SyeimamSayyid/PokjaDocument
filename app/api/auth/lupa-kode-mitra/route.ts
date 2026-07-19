import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Kolom Pengajuan Mitra (0-based) — dipakai buat cocokkan email+noWa -> institusi
const PJ = { NAMA: 2, JENIS: 3, EMAIL: 7, WA: 8 };

// Kolom Dokumen Kerja sama (0-based) — dipakai buat ambil kode akses aktual
const DOK = {
  ID: 0, JENIS: 1, JUDUL: 2, NAMA_MITRA: 4,
  KODE: 10, KODE_EXP: 11,
};

// Maksimal 5 percobaan per 30 menit, per alamat IP.
const LIMIT = 5;
const WINDOW_MS = 30 * 60 * 1000;

function normNama(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Normalisasi nomor WA — biar "0812..." dan "62812..." dianggap sama
// Normalisasi nomor WA jadi "inti" angkanya saja — kupas prefix apa pun
// (baik "0" di depan maupun kode negara "62"), biar "081243241465",
// "81243241465" (Sheets sering menghapus angka 0 di depan kalau selnya
// dianggap angka, bukan teks), dan "6281243241465" semuanya dianggap SAMA.
function normWa(s: string): string {
  let digits = String(s || '').replace(/\D/g, '');
  if (digits.startsWith('62')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitResult = checkRateLimit(`lupa-kode-mitra:${ip}`, LIMIT, WINDOW_MS);

  if (!limitResult.allowed) {
    return NextResponse.json(
      { message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(limitResult.retryAfterSeconds / 60)} menit.`, terkunci: true },
      { status: 429, headers: { 'Retry-After': String(limitResult.retryAfterSeconds) } }
    );
  }

  try {
    const { email, noWa } = await req.json();
    const emailBersih = String(email || '').trim().toLowerCase();
    const waBersih     = normWa(noWa);
    if (!emailBersih || !waBersih) {
      return NextResponse.json({ message: 'Email dan No HP wajib diisi.' }, { status: 400 });
    }

    // Cocokkan email DAN no HP sekaligus (dua faktor) di Pengajuan Mitra,
    // supaya tidak cukup cuma tau salah satu buat "menebak" kode orang lain.
    const pjRows = await getSheetData('Pengajuan Mitra');
    const cocok = pjRows.filter(r =>
      String(r[PJ.EMAIL] || '').trim().toLowerCase() === emailBersih &&
      normWa(String(r[PJ.WA] || '')) === waBersih
    );

    if (cocok.length === 0) {
      return NextResponse.json({
        message: 'Email dan No HP yang Anda masukkan tidak ditemukan dalam sistem.',
        ditemukan: false,
      }, { status: 404 });
    }

    // Ambil semua nama institusi (+jenis) yang cocok, lalu cari dokumen
    // aktualnya di "Dokumen Kerja sama" buat ambil kode akses yang sekarang berlaku.
    const dokRows = await getSheetData('Dokumen Kerja sama');
    const now = new Date();
    const dokumenDitemukan: { idDokumen: string; jenis: string; judul: string; namaMitra: string; kodeAkses: string; kodeExpire: string }[] = [];

    cocok.forEach(pj => {
      const namaTarget = normNama(String(pj[PJ.NAMA]));
      const jenisTarget = String(pj[PJ.JENIS]).toUpperCase();
      const dok = dokRows.find(d =>
        d[DOK.ID] &&
        normNama(String(d[DOK.NAMA_MITRA])) === namaTarget &&
        String(d[DOK.JENIS]).toUpperCase() === jenisTarget &&
        String(d[DOK.KODE] || '').trim()
      );
      if (!dok) return;

      const kodeExpireStr = String(dok[DOK.KODE_EXP] || '');
      const kodeExpire = kodeExpireStr ? new Date(kodeExpireStr) : null;
      if (kodeExpire && !isNaN(kodeExpire.getTime()) && now > kodeExpire) return; // kedaluwarsa, skip

      // Hindari duplikat kalau ada 2 baris pengajuan yang mengarah ke dokumen yang sama
      if (dokumenDitemukan.some(d => d.idDokumen === String(dok[DOK.ID]))) return;

      dokumenDitemukan.push({
        idDokumen: String(dok[DOK.ID]),
        jenis: String(dok[DOK.JENIS]),
        judul: String(dok[DOK.JUDUL]),
        namaMitra: String(dok[DOK.NAMA_MITRA]),
        kodeAkses: String(dok[DOK.KODE]),
        kodeExpire: kodeExpireStr,
      });
    });

    if (dokumenDitemukan.length === 0) {
      return NextResponse.json({
        message: 'Ditemukan data pengajuan Anda, tapi belum ada kode akses aktif (kemungkinan pengajuan belum disetujui, atau kode sudah kedaluwarsa). Hubungi Pokja Kerja Sama untuk kode baru.',
        ditemukan: true,
      }, { status: 404 });
    }

    // Kirim ulang email kode akses utk tiap dokumen yang ditemukan (biasanya 1)
    let terkirim = 0;
    for (const dok of dokumenDitemukan) {
      try {
        const r = await fetch(APPS_SCRIPT_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'kirimEmailAkses', email: emailBersih, namaMitra: dok.namaMitra,
            jenis: dok.jenis, judul: dok.judul, kodeAkses: dok.kodeAkses,
            kodeExpire: dok.kodeExpire, idDokumen: dok.idDokumen,
          }),
          redirect: 'follow',
        });
        const d = await r.json();
        if (d.success) terkirim++;
      } catch (e) {
        console.error('[LUPA_KODE_MITRA] Gagal kirim salah satu email:', e);
      }
    }

    if (terkirim === 0) {
      return NextResponse.json({ message: 'Gagal mengirim email. Coba lagi nanti.' }, { status: 500 });
    }

    return NextResponse.json({
      message: terkirim === 1
        ? 'Kode akses Anda telah dikirim ulang ke email Anda. Silakan periksa email Anda, dan jika tidak ada, periksa juga folder Spam.'
        : `${terkirim} kode akses ditemukan dan telah dikirim ulang ke email Anda. Silakan periksa email Anda.`,
      ditemukan: true,
    });
  } catch (err) {
    console.error('[LUPA_KODE_MITRA] Error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan. Coba lagi nanti.' }, { status: 500 });
  }
}