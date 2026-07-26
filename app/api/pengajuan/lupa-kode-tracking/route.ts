import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Kolom Pengajuan Mitra (0-based)
const PJ = { ID: 0, NAMA: 2, JENIS: 3, EMAIL: 7, STATUS: 9, KODE: 10 };

// Maksimal 5 percobaan per 30 menit, per alamat IP — jaga-jaga penyalahgunaan
// (orang coba-coba banyak email buat lihat mana yang "ketemu").
const LIMIT = 5;
const WINDOW_MS = 30 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitResult = checkRateLimit(`lupa-kode-tracking:${ip}`, LIMIT, WINDOW_MS);

  if (!limitResult.allowed) {
    return NextResponse.json(
      { message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(limitResult.retryAfterSeconds / 60)} menit.`, terkunci: true },
      { status: 429, headers: { 'Retry-After': String(limitResult.retryAfterSeconds) } }
    );
  }

  try {
    const { email } = await req.json();
    const emailBersih = String(email || '').trim().toLowerCase();
    if (!emailBersih) {
      return NextResponse.json({ message: 'Email wajib diisi.' }, { status: 400 });
    }

    const pjRows = await getSheetData('Pengajuan Mitra');
    const cocok = pjRows.filter(r => String(r[PJ.EMAIL] || '').trim().toLowerCase() === emailBersih && r[PJ.ID]);

    // Selalu balas sukses generik terlepas ketemu atau tidak — supaya orang
    // luar tidak bisa "menebak-nebak" email mana saja yang terdaftar di
    // sistem cuma dari respons API (mencegah enumerasi email).
    if (cocok.length === 0) {
      return NextResponse.json({ message: 'Jika email tersebut terdaftar, kode tracking akan segera dikirim ke email Anda.' });
    }

    const daftarPengajuan = cocok.map(r => ({
      namaInstitusi: String(r[PJ.NAMA] || ''),
      jenis: String(r[PJ.JENIS] || ''),
      status: String(r[PJ.STATUS] || ''),
      kodeTracking: String(r[PJ.KODE] || ''),
    })).filter(p => p.kodeTracking);

    if (daftarPengajuan.length === 0) {
      return NextResponse.json({ message: 'Jika email tersebut terdaftar, kode tracking akan segera dikirim ke email Anda.' });
    }

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kirimUlangKodeTracking', email: emailBersih, daftarPengajuan }),
        redirect: 'follow',
      });
    } catch (e) { console.error('[EMAIL LUPA KODE TRACKING]', e); }

    return NextResponse.json({ message: 'Jika email tersebut terdaftar, kode tracking akan segera dikirim ke email Anda.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}