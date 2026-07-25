import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell } from '@/lib/sheet';
import { google } from 'googleapis';
import { requireSession } from '@/lib/auth';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

const DOK_COL = { ID: 0, JENIS: 1, NAMA_MITRA: 4, TEMPLATE_MITRA: 19, SUMBER_TEMPLATE_AKTIF: 35 };

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

interface Kandidat { fileId: string; namaFile: string; fileUrl: string; namaInstansi: string; sumber: 'dashboard' | 'resmi'; }

// ── GET: kandidat template — upload mitra untuk dokumen INI, DAN template
// resmi BNN (MOU/PKS, dari env) sebagai opsi buat "kembali ke resmi". ──
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idDokumen = searchParams.get('idDokumen')?.trim();
    if (!idDokumen) return NextResponse.json({ message: 'idDokumen wajib diisi.' }, { status: 400 });

    const dokRows = await getSheetData('Dokumen Kerja sama');
    const dok = dokRows.find(r => String(r[DOK_COL.ID] || '').trim() === idDokumen);
    if (!dok) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    const jenisDok = String(dok[DOK_COL.JENIS] || '').trim().toUpperCase();
    const namaInstansiDok = String(dok[DOK_COL.NAMA_MITRA] || '').trim();
    const templateFileId  = String(dok[DOK_COL.TEMPLATE_MITRA] || '').trim();

    // ID template resmi BNN — dari env, dipisah per jenis (MOU/PKS), SAMA
    // dengan yang dipakai saat dokumen digenerate pertama kali. Cuma dikirim
    // ID-nya ke response (bukan di-hardcode di frontend), biar env var tetap
    // server-side only.
    const templateResmiId = jenisDok === 'PKS'
      ? process.env.GOOGLE_TEMPLATE_PKS_ID
      : process.env.GOOGLE_TEMPLATE_MOU_ID;

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

    return NextResponse.json({ data: kandidat, templateResmiId: templateResmiId || null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: eksekusi ganti dokumen kerja ke template mitra ATAU kembali ke
// template resmi BNN — sama-sama dikirim sebagai templateFileId, endpoint
// & Apps Script action-nya sudah generic, tidak perlu dibedakan. ──────────
export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

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

    // Catat mana yang SEDANG dipakai sekarang ("resmi" atau "mitra") — dipakai
    // frontend buat tentukan kartu mana yang tampil sebagai "aktif", biar
    // tidak hardcode salah satu selalu terlihat aktif.
    try {
      const dokRows = await getSheetData('Dokumen Kerja sama');
      const rowIdx = dokRows.findIndex(r => String(r[DOK_COL.ID] || '').trim() === idDokumen);
      if (rowIdx !== -1) {
        const jenisDok = String(dokRows[rowIdx][DOK_COL.JENIS] || '').trim().toUpperCase();
        const idResmiSesuaiJenis = jenisDok === 'PKS' ? process.env.GOOGLE_TEMPLATE_PKS_ID : process.env.GOOGLE_TEMPLATE_MOU_ID;
        const sumberBaru = templateFileId === idResmiSesuaiJenis ? 'resmi' : 'mitra';
        await updateCell('Dokumen Kerja sama', rowIdx + 2, DOK_COL.SUMBER_TEMPLATE_AKTIF + 1, sumberBaru);
      }
    } catch (e) { console.error('[CATAT SUMBER TEMPLATE]', e); }

    return NextResponse.json({ docsId: d.docsId, docsUrl: d.docsUrl, message: d.message });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}