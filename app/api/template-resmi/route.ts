import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

// ── GET: ID template resmi BNN (MOU/PKS) dari env — dipakai halaman
// Kelola Pengajuan buat preview "Template Resmi BNN" SEBELUM dokumen
// digenerate (jadi belum ada idDokumen, tidak bisa pakai endpoint
// /api/dokumen/ganti-template yang butuh idDokumen). ──────────────────
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const jenis = (searchParams.get('jenis') || '').trim().toUpperCase();

    const templateId = jenis === 'PKS'
      ? process.env.GOOGLE_TEMPLATE_PKS_ID
      : process.env.GOOGLE_TEMPLATE_MOU_ID;

    return NextResponse.json({ templateId: templateId || null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}