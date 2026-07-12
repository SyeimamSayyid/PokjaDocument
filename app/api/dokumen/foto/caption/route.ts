import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

const URL_GS = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Admin/superadmin bebas; mitra HANYA boleh edit caption foto dokumennya sendiri.
async function checkAkses(req: NextRequest, idDokumen: string) {
  const session = await requireSession(req);
  if (!session) return null;
  if (['admin', 'superadmin'].includes(String(session.role))) return session;
  if (session.role === 'mitra' && String(session.idDokumen) === idDokumen) return session;
  return null;
}

// Edit caption foto yang sudah diunggah sebelumnya
export async function POST(req: NextRequest) {
  try {
    const { fileId, caption, idDokumen } = await req.json();
    if (!fileId) return NextResponse.json({ message: 'fileId wajib diisi.' }, { status: 400 });

    const session = await checkAkses(req, String(idDokumen || ''));
    if (!session) {
      return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
    }

    const res = await fetch(URL_GS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateCaptionFoto', fileId, caption: caption || '' }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (d.success === false) return NextResponse.json({ message: d.error || 'Gagal menyimpan caption.' }, { status: 400 });
    return NextResponse.json({ caption: d.caption ?? caption ?? '' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}