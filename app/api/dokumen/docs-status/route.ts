import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { google } from 'googleapis';
import { requireSession } from '@/lib/auth';

const COL = { ID: 0, DOCS_ID: 12 };

async function checkAkses(req: NextRequest, idDokumen: string) {
  const session = await requireSession(req);
  if (!session) return null;
  if (['admin', 'superadmin'].includes(String(session.role))) return session;
  if (session.role === 'mitra' && String(session.idDokumen) === idDokumen) return session;
  return null;
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

// GET ?idDokumen=X → { modifiedTime: "2026-07-15T08:12:03.000Z" }
// Endpoint ringan, cuma metadata — dipanggil berkala (polling) dari frontend
// untuk mendeteksi apakah dokumen baru saja diubah.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('idDokumen')?.trim();
    if (!idDokumen) return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });

    const session = await checkAkses(req, idDokumen);
    if (!session) {
      return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
    }

    const rows = await getSheetData('Dokumen Kerja sama');
    const row = rows.find(r => String(r[COL.ID] || '').trim() === idDokumen);
    if (!row) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const docsId = String(row[COL.DOCS_ID] || '');
    if (!docsId) return NextResponse.json({ modifiedTime: null });

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const meta = await drive.files.get({ fileId: docsId, fields: 'modifiedTime' });

    return NextResponse.json({ modifiedTime: meta.data.modifiedTime || null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}