import { NextRequest, NextResponse } from 'next/server';
const URL_GS = process.env.APPS_SCRIPT_WEBAPP_URL!;

// GET — daftar semua notifikasi admin (kotak masuk bersama)
export async function GET() {
  try {
    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listNotifikasiAdmin' }),
      redirect: 'follow',
    });
    const d = await res.json();
    return NextResponse.json({ notifikasi: d.notifikasi || [], belumDibaca: d.belumDibaca || 0 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH — tandai dibaca (satu id, atau semua sekaligus)
export async function PATCH(req: NextRequest) {
  try {
    const { id, semua } = await req.json();
    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tandaiNotifikasiAdmin', id, semua }),
      redirect: 'follow',
    });
    const d = await res.json();
    return NextResponse.json({ message: d.message || 'Diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}