import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { google } from 'googleapis';
import { requireSession } from '@/lib/auth';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Admin/superadmin bebas; mitra HANYA boleh akses dokumennya sendiri.
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

// ── GET: cek apakah dokumen ini sudah punya template mitra ────
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
    const row  = rows.find(r => String(r[0] || '').trim() === idDokumen);
    if (!row) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const templateFileId = String(row[19] || '').trim(); // kolom 19 = Template Mitra ID
    if (!templateFileId) return NextResponse.json({ data: null });

    try {
      const auth  = getAuth();
      const drive = google.drive({ version: 'v3', auth });
      const meta  = await drive.files.get({ fileId: templateFileId, fields: 'name,webViewLink' });
      return NextResponse.json({
        data: {
          fileId: templateFileId,
          namaFile: meta.data.name || 'Draf Template',
          fileUrl: meta.data.webViewLink || `https://docs.google.com/document/d/${templateFileId}/edit`,
        },
      });
    } catch {
      // fileId tersimpan tapi metadata gagal diambil — tetap kembalikan id mentah
      return NextResponse.json({ data: { fileId: templateFileId, namaFile: 'Draf Template', fileUrl: '' } });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: upload draf baru dari halaman dokumen mitra ──────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idDokumen, fileBase64, fileName, fileMime } = body;

    if (!idDokumen)  return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });

    const session = await checkAkses(req, idDokumen);
    if (!session) {
      return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
    }

    if (!fileBase64 || !fileName || !fileMime) {
      return NextResponse.json({ message: 'File wajib diunggah.' }, { status: 400 });
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'uploadTemplateMitraDokumen',
        idDokumen, namaFile: fileName, base64Data: fileBase64, mimeType: fileMime,
      }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (!d.success) {
      return NextResponse.json({ message: d.message || 'Gagal mengunggah draf.' }, { status: 400 });
    }
    return NextResponse.json({ data: { fileId: d.fileId, fileUrl: d.fileUrl, namaFile: d.namaFile } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}