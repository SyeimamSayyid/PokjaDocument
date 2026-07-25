import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

const SHEET_ARSIP = 'Arsip Dokumen';
const SHEET_DOK = 'Dokumen Kerja sama';
const SHEET_ADMIN = 'Admin';

const ARS_COL = { ID: 0, NAMA: 1, JENIS: 2, JUDUL: 3, OLEH: 13 };
const DOK_COL = { ID: 0, JENIS: 1, JUDUL: 2, NAMA_MITRA: 4, DIBUAT_OLEH: 15 };
// Kolom Admin: 0 ID, 1 Nama, 2 Email, 3 PasswordHash, 4 Status, 5 DibuatOleh, 6 TanggalDibuat, 7 TerakhirLogin, 8 Level, 9 Wilayah
const ADM_COL = { NAMA: 1, EMAIL: 2 };

// "OLEH"/"DIBUAT_OLEH" bisa berisi EMAIL langsung (kalau admin login pakai
// email) ATAU nama (mis. "Superadmin"/nama tampilan) — tangani dua-duanya:
// kalau sudah kelihatan seperti email, pakai langsung; kalau bukan, lookup
// ke sheet Admin berdasarkan nama buat dapat emailnya.
async function resolveEmailAdmin(olehStr: string): Promise<{ email: string; nama: string } | null> {
  const oleh = String(olehStr || '').trim();
  if (!oleh) return null;
  if (oleh.includes('@')) return { email: oleh, nama: oleh };

  const adminRows = await getSheetData(SHEET_ADMIN);
  const normalisasi = (s: string) => s.trim().toLowerCase();
  const found = adminRows.find(r => normalisasi(String(r[ADM_COL.NAMA] || '')) === normalisasi(oleh));
  if (!found) return null;
  const email = String(found[ADM_COL.EMAIL] || '').trim();
  if (!email) return null;
  return { email, nama: oleh };
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  const s = session as Record<string, unknown>;
  if (String(s.level || '') !== 'utama') {
    return NextResponse.json({ message: 'Fitur ini khusus Admin BNN Utama.' }, { status: 403 });
  }

  try {
    const { id, sumber, alasan } = await req.json();
    if (!id || !['manual', 'sistem'].includes(sumber)) {
      return NextResponse.json({ message: 'ID dan sumber (manual/sistem) wajib diisi.' }, { status: 400 });
    }

    let namaInstitusi = '', jenis = '', judul = '', olehStr = '';

    if (sumber === 'manual') {
      const rows = await getSheetData(SHEET_ARSIP);
      const row = rows.find(r => String(r[ARS_COL.ID] || '').trim() === String(id).trim());
      if (!row) return NextResponse.json({ message: 'Data arsip tidak ditemukan.' }, { status: 404 });
      namaInstitusi = String(row[ARS_COL.NAMA] || '');
      jenis = String(row[ARS_COL.JENIS] || '');
      judul = String(row[ARS_COL.JUDUL] || '');
      olehStr = String(row[ARS_COL.OLEH] || '');
    } else {
      const rows = await getSheetData(SHEET_DOK);
      const row = rows.find(r => String(r[DOK_COL.ID] || '').trim() === String(id).trim());
      if (!row) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });
      namaInstitusi = String(row[DOK_COL.NAMA_MITRA] || '');
      jenis = String(row[DOK_COL.JENIS] || '');
      judul = String(row[DOK_COL.JUDUL] || '');
      olehStr = String(row[DOK_COL.DIBUAT_OLEH] || '');
    }

    const adminTujuan = await resolveEmailAdmin(olehStr);
    if (!adminTujuan) {
      return NextResponse.json({
        message: `Tidak dapat menemukan email admin pengupload ("${olehStr || 'tidak diketahui'}"). Hubungi admin secara manual.`,
      }, { status: 404 });
    }

    const namaBnnUtama = String(s.email || s.username || s.nama || 'Admin BNN Utama');

    const res = await fetch(process.env.APPS_SCRIPT_WEBAPP_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'kirimEmailMintaDokumenArsip',
        emailTujuan: adminTujuan.email, namaAdminTujuan: adminTujuan.nama,
        namaInstitusi, judul, jenis, alasan: alasan || '', namaBnnUtama,
      }),
      redirect: 'follow',
    });
    const d = await res.json();
    if (!d.success) {
      return NextResponse.json({ message: d.message || 'Gagal mengirim email permintaan.' }, { status: 400 });
    }

    return NextResponse.json({ message: d.message || `Permintaan terkirim ke ${adminTujuan.email}.` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}