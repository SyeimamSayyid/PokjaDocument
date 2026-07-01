import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { google } from 'googleapis';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

const DOK_COL = { ID: 0, NAMA_MITRA: 4, TEMPLATE_MITRA: 19 };

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

interface Kandidat { fileId: string; namaFile: string; fileUrl: string; namaInstansi: string; sumber: 'dashboard'; }

// ── GET: satu-satunya sumber = upload mitra khusus untuk dokumen INI ──
// (kolom "Template Mitra ID" di baris dokumen — diisi via card "Draf Template Anda"
// di halaman mitra). TIDAK lagi menebak dari riwayat Pengajuan Mitra lama,
// karena itu menangkap upload lama yang tidak relevan / sudah tidak dipakai.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('idDokumen')?.trim();
    if (!idDokumen) return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });

    const dokRows = await getSheetData('Dokumen Kerja sama');
    const dok = dokRows.find(r => String(r[DOK_COL.ID] || '').trim() === idDokumen);
    if (!dok) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const namaInstansiDok = String(dok[DOK_COL.NAMA_MITRA] || '').trim();
    const templateFileId  = String(dok[DOK_COL.TEMPLATE_MITRA] || '').trim();

    const kandidat: Kandidat[] = [];

    if (templateFileId) {
      let namaFile = 'Draf dari Dashboard Mitra';
      let fileUrl = `https://docs.google.com/document/d/${templateFileId}/edit`;
      try {
        const auth  = getAuth();
        const drive = google.drive({ version: 'v3', auth });
        const meta  = await drive.files.get({ fileId: templateFileId, fields: 'name,webViewLink' });
        namaFile = meta.data.name || namaFile;
        fileUrl  = meta.data.webViewLink || fileUrl;
      } catch { /* metadata opsional, tetap tampilkan kandidat walau gagal ambil nama */ }
      kandidat.push({ fileId: templateFileId, namaFile, fileUrl, namaInstansi: namaInstansiDok, sumber: 'dashboard' });
    }

    return NextResponse.json({ data: kandidat });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: eksekusi ganti dokumen kerja ke template mitra ──────
export async function POST(req: NextRequest) {
  try {
    const { idDokumen, templateFileId } = await req.json();
    if (!idDokumen || !templateFileId) {
      return NextResponse.json({ message: 'idDokumen dan templateFileId wajib diisi.' }, { status: 400 });
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'gantiTemplateMitra', idDokumen, templateFileId }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (!d.success) {
      return NextResponse.json({ message: d.message || 'Gagal mengganti template.' }, { status: 400 });
    }
    return NextResponse.json({ docsId: d.docsId, docsUrl: d.docsUrl, message: d.message });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}