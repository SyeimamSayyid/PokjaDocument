import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

async function callScript(payload: Record<string, unknown>) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  return res.json();
}

// GET: daftar notifikasi mitra ?idMitra= atau ?idDokumen=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idMitra   = searchParams.get('idMitra')   || '';
    const idDokumen = searchParams.get('idDokumen') || '';
    if (!idMitra && !idDokumen) {
      return NextResponse.json({ notifikasi: [], belumDibaca: 0 });
    }
    const d = await callScript({ action: 'listNotifikasi', idMitra, idDokumen });
    return NextResponse.json({ notifikasi: d.notifikasi || [], belumDibaca: d.belumDibaca || 0 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH: tandai dibaca { id } atau { idMitra/idDokumen, semua:true }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const d = await callScript({ action: 'tandaiNotifikasi', ...body });
    if (!d.success) return NextResponse.json({ message: d.error || 'Gagal.' }, { status: 500 });
    return NextResponse.json({ message: d.message });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}