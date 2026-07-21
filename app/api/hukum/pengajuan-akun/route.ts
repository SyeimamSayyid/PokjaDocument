import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateCell } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const SHEET_PENGAJUAN = 'Pengajuan Akun Pegawai';
const SHEET_MASTER = 'Data Pegawai BNN Master';
const SHEET_PEGAWAI = 'Pegawai BNN';

// Kolom Pengajuan Akun Pegawai (0-based)
const PA = {
  ID: 0, NAMA: 1, NIP: 2, EMAIL: 3, LOKASI: 4, STATUS: 5,
  TGL_DIAJUKAN: 6, DIPROSES_OLEH: 7, TGL_DIPROSES: 8, COCOK_MASTER: 9,
};
// Kolom Data Pegawai BNN Master (0-based) — hasil import Excel
const M = { NIP: 0, NAMA: 1, LOKASI: 2, STATUS: 3 };
// Kolom Pegawai BNN (akun aktif buat login) — NIP, Lokasi, Status
const PG = { NIP: 0, LOKASI: 1, STATUS: 2 };

const LOKASI_VALID = ['BNNP Sulsel', 'BNNK Palopo', 'BNNK Toraja', 'BNNK Bone', 'BNNK Sidrap'];

function normNip(s: unknown): string {
  return String(s || '').replace(/\D/g, '');
}
function normNama(s: unknown): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,]/g, '');
}

interface PengajuanAkun {
  id: string; nama: string; nip: string; email: string; lokasi: string; status: string;
  tglDiajukan: string; diprosesOleh: string; tglDiproses: string; cocokMaster: boolean;
}

// ── GET: admin lihat semua pengajuan (dengan tanda cocok/tidak ke master) ──
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const cariMaster = searchParams.get('cariMaster'); // dipakai admin buat "cek cepat" manual

    // Mode "cek cepat" — cari langsung di data master, TERPISAH dari daftar pengajuan.
    // Dipakai admin buat verifikasi manual NIP/nama siapa saja, tanpa perlu ada pengajuan dulu.
    if (cariMaster !== null) {
      const masterRows = await getSheetData(SHEET_MASTER);
      const q = cariMaster.trim().toLowerCase();
      const nipTerlihat = new Set<string>();
      const hasil = masterRows
        .filter(r => r[M.NIP])
        .filter(r => !q || normNip(r[M.NIP]).includes(normNip(q)) || String(r[M.NAMA]).toLowerCase().includes(q))
        .map(r => ({ nip: String(r[M.NIP]), nama: String(r[M.NAMA]), lokasi: String(r[M.LOKASI]), status: String(r[M.STATUS]) }))
        // Dedup berdasarkan NIP — jaga-jaga kalau data master masih ada
        // duplikat dari upload lama sebelum fitur dedup-saat-upload dipasang.
        .filter(r => {
          if (nipTerlihat.has(r.nip)) return false;
          nipTerlihat.add(r.nip);
          return true;
        })
        .slice(0, 30); // batasi biar tidak berat kalau ketik pendek
      return NextResponse.json({ master: hasil });
    }

    const [rows, masterRows] = await Promise.all([
      getSheetData(SHEET_PENGAJUAN),
      getSheetData(SHEET_MASTER).catch(() => []),
    ]);
    const masterNipSet = new Set((masterRows || []).map(r => normNip(r[M.NIP])).filter(Boolean));
    const masterNamaSet = new Set((masterRows || []).map(r => normNama(r[M.NAMA])).filter(Boolean));

    const data: PengajuanAkun[] = rows.filter(r => r[PA.ID]).map(r => {
      const nip = String(r[PA.NIP] || '');
      const nama = String(r[PA.NAMA] || '');
      return {
        id: String(r[PA.ID] || ''),
        nama, nip,
        email: String(r[PA.EMAIL] || ''),
        lokasi: String(r[PA.LOKASI] || ''),
        status: String(r[PA.STATUS] || 'Menunggu'),
        tglDiajukan: String(r[PA.TGL_DIAJUKAN] || ''),
        diprosesOleh: String(r[PA.DIPROSES_OLEH] || ''),
        tglDiproses: String(r[PA.TGL_DIPROSES] || ''),
        // Ditandai cocok kalau NIP ATAU nama-nya ketemu di data master — bantu
        // admin lihat sekilas tanpa perlu cari manual satu-satu.
        cocokMaster: masterNipSet.has(normNip(nip)) || masterNamaSet.has(normNama(nama)),
      };
    });

    data.sort((a, b) => new Date(b.tglDiajukan).getTime() - new Date(a.tglDiajukan).getTime());

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: pegawai ajukan akun baru (PUBLIK — belum punya akun, jadi tidak butuh sesi) ──
export async function POST(req: NextRequest) {
  try {
    const { nama, nip, email, lokasi } = await req.json();

    if (!nama?.trim()) return NextResponse.json({ message: 'Nama wajib diisi.' }, { status: 400 });
    const nipBersih = normNip(nip);
    if (!nipBersih || nipBersih.length < 6) return NextResponse.json({ message: 'NIP/NRP tidak valid.' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ message: 'Email valid wajib diisi.' }, { status: 400 });
    }
    if (!LOKASI_VALID.includes(lokasi)) {
      return NextResponse.json({ message: 'Pilih lokasi BNNP/BNNK yang valid.' }, { status: 400 });
    }

    // Cek belum ada akun aktif dengan NIP yang sama
    const pegawaiRows = await getSheetData(SHEET_PEGAWAI).catch(() => []);
    const sudahAdaAkun = pegawaiRows.some(r => normNip(r[PG.NIP]) === nipBersih);
    if (sudahAdaAkun) {
      return NextResponse.json({ message: 'NIP ini sudah terdaftar dan punya akun aktif. Silakan login langsung.' }, { status: 409 });
    }

    // Cek belum ada pengajuan yang masih menunggu dengan NIP yang sama
    const pengajuanRows = await getSheetData(SHEET_PENGAJUAN).catch(() => []);
    const sudahMenunggu = pengajuanRows.some(r => r[PA.ID] && normNip(r[PA.NIP]) === nipBersih && String(r[PA.STATUS]).trim() === 'Menunggu');
    if (sudahMenunggu) {
      return NextResponse.json({ message: 'Sudah ada pengajuan dengan NIP ini yang masih menunggu diproses admin.' }, { status: 409 });
    }

    const id = generateId('PGB');
    const now = formatTanggalWaktu(new Date());
    await appendRow(SHEET_PENGAJUAN, [id, nama.trim(), nipBersih, email.trim(), lokasi, 'Menunggu', now, '', '', '']);

    return NextResponse.json({ message: 'Pengajuan akun berhasil dikirim. Admin akan memverifikasi dan mengaktifkan akun Anda.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: admin setujui/tolak pengajuan ──
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { id, keputusan, diprosesOleh } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID pengajuan wajib diisi.' }, { status: 400 });
    if (!['Disetujui', 'Ditolak'].includes(keputusan)) {
      return NextResponse.json({ message: 'Keputusan tidak dikenali.' }, { status: 400 });
    }

    const rows = await getSheetData(SHEET_PENGAJUAN);
    const idx = rows.findIndex(r => String(r[PA.ID]).trim() === String(id).trim());
    if (idx === -1) return NextResponse.json({ message: 'Pengajuan tidak ditemukan.' }, { status: 404 });

    const statusSkrg = String(rows[idx][PA.STATUS] || 'Menunggu');
    if (statusSkrg !== 'Menunggu') {
      return NextResponse.json({ message: `Pengajuan ini sudah "${statusSkrg}" — tidak bisa diproses ulang.` }, { status: 400 });
    }

    const rowNumber = idx + 2;
    await updateCell(SHEET_PENGAJUAN, rowNumber, PA.STATUS + 1, keputusan);
    await updateCell(SHEET_PENGAJUAN, rowNumber, PA.DIPROSES_OLEH + 1, diprosesOleh || '');
    await updateCell(SHEET_PENGAJUAN, rowNumber, PA.TGL_DIPROSES + 1, formatTanggalWaktu(new Date()));

    // Kalau disetujui — langsung buat akun aktif di sheet Pegawai BNN, biar
    // pegawai bisa login pakai NIP-nya tanpa langkah tambahan.
    if (keputusan === 'Disetujui') {
      const nip = String(rows[idx][PA.NIP] || '');
      const lokasi = String(rows[idx][PA.LOKASI] || '');
      await appendRow(SHEET_PEGAWAI, [nip, lokasi, 'Aktif']);
    }

    return NextResponse.json({ message: `Pengajuan berhasil ${keputusan === 'Disetujui' ? 'disetujui — akun sudah aktif' : 'ditolak'}.` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}