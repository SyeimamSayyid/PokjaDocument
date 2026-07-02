import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Link login mitra — sesuaikan dengan domain produksi bila sudah deploy
const LINK_LOGIN = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/login`
  : 'https://pokja-document.vercel.app/login-mitra';

export async function POST(req: NextRequest) {
  try {
    const { email, namaMitra, jenis, judul, kodeAkses, kodeExpire, idDokumen } = await req.json();

    if (!email || !kodeAkses) {
      return NextResponse.json({ message: 'Email penerima dan kode akses wajib diisi.' }, { status: 400 });
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'kirimEmailAkses',
        email, namaMitra, jenis, judul, kodeAkses, kodeExpire, idDokumen,
        linkLogin: LINK_LOGIN,
      }),
      redirect: 'follow',
    });

    const d = await res.json();
    if (!d.success) {
      return NextResponse.json({ message: d.error || 'Gagal mengirim email.' }, { status: 500 });
    }

    return NextResponse.json({ message: d.message || `Email terkirim ke ${email}.` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}