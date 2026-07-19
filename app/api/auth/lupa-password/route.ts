import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Kolom Admin (0-based)
const ADM = { NAMA: 1, EMAIL: 2, PASSWORD: 3, STATUS: 4 };
// Kolom Superadmin (0-based) — sheet lama, transisi
const SUP = { NAMA: 1, EMAIL: 2, PASSWORD: 3, STATUS: 4 };

// Maksimal 5 percobaan per 30 menit, per alamat IP.
const LIMIT = 5;
const WINDOW_MS = 30 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitResult = checkRateLimit(`lupa-password:${ip}`, LIMIT, WINDOW_MS);

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

    // ── Cari email di sheet Admin, lalu Superadmin (transisi lama) ──
    let nama = '', password = '', ditemukan = false;

    try {
      const adminRows = await getSheetData('Admin');
      const match = adminRows.find(r => String(r[ADM.EMAIL] || '').trim().toLowerCase() === emailBersih);
      if (match) {
        nama = String(match[ADM.NAMA] || 'Admin');
        password = String(match[ADM.PASSWORD] || '');
        ditemukan = true;
      }
    } catch {}

    if (!ditemukan) {
      try {
        const supRows = await getSheetData('Superadmin');
        const match = supRows.find(r => String(r[SUP.EMAIL] || '').trim().toLowerCase() === emailBersih);
        if (match) {
          nama = String(match[SUP.NAMA] || 'Admin');
          password = String(match[SUP.PASSWORD] || '');
          ditemukan = true;
        }
      } catch {}
    }

    // Email tidak terdaftar — kasih tau spesifik (sesuai permintaan; catatan:
    // ini melonggarkan proteksi anti-enumeration, tapi rate limit di atas
    // membatasi seberapa banyak orang bisa "meraba-raba" email valid).
    if (!ditemukan) {
      return NextResponse.json({ message: 'Email anda tidak terdaftar dalam sistem ini.', terdaftar: false }, { status: 404 });
    }

    if (!password) {
      return NextResponse.json({ message: 'Akun ditemukan tapi tidak punya password tersimpan. Hubungi admin lain.', terdaftar: true }, { status: 400 });
    }

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kirimEmailAdminAkses', email: emailBersih, nama, password }),
        redirect: 'follow',
      });
    } catch (e) {
      console.error('[LUPA_PASSWORD] Gagal kirim email:', e);
      return NextResponse.json({ message: 'Gagal mengirim email. Coba lagi nanti.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Kami telah mengirimkan informasi akun dan password login Anda melalui email. Silakan periksa email Anda, dan jika tidak ada, periksa juga folder Spam.',
      terdaftar: true,
    });
  } catch (err) {
    console.error('[LUPA_PASSWORD] Error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan. Coba lagi nanti.' }, { status: 500 });
  }
}