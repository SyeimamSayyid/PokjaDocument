import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateCell } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const SHEET = 'Pendampingan Hukum';

// Kolom (0-based, 13 kolom)
const C = {
  ID: 0, NIP: 1, NAMA: 2, LOKASI_BNN: 3, EMAIL: 4, TGL_KEJADIAN: 5, WAKTU_KEJADIAN: 6, TEMPAT_KEJADIAN: 7,
  PASAL: 8, DESKRIPSI: 9, STATUS: 10, TGL_DIAJUKAN: 11,
  DIPROSES_OLEH: 12, CATATAN_ADMIN: 13, TGL_DIPROSES: 14,
};

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

const STATUS_VALID = ['Diajukan', 'Ditinjau', 'Diproses', 'Selesai', 'Ditolak'];
// Urutan status MAJU yang diizinkan (mengikuti pola transisi terkontrol di modul kerja sama)
const URUTAN_STATUS = ['Diajukan', 'Ditinjau', 'Diproses', 'Selesai'];

interface PendampinganItem {
  id: string; nip: string; nama: string; lokasiBnn: string; email: string; tglKejadian: string; waktuKejadian: string;
  tempatKejadian: string; pasal: string; deskripsi: string; status: string;
  tglDiajukan: string; diprosesOleh: string; catatanAdmin: string; tglDiproses: string;
}

function mapRow(r: string[]): PendampinganItem {
  return {
    id: String(r[C.ID] || ''),
    nip: String(r[C.NIP] || ''),
    nama: String(r[C.NAMA] || ''),
    lokasiBnn: String(r[C.LOKASI_BNN] || ''),
    email: String(r[C.EMAIL] || ''),
    tglKejadian: String(r[C.TGL_KEJADIAN] || ''),
    waktuKejadian: String(r[C.WAKTU_KEJADIAN] || ''),
    tempatKejadian: String(r[C.TEMPAT_KEJADIAN] || ''),
    pasal: String(r[C.PASAL] || ''),
    deskripsi: String(r[C.DESKRIPSI] || ''),
    status: String(r[C.STATUS] || 'Diajukan'),
    tglDiajukan: String(r[C.TGL_DIAJUKAN] || ''),
    diprosesOleh: String(r[C.DIPROSES_OLEH] || ''),
    catatanAdmin: String(r[C.CATATAN_ADMIN] || ''),
    tglDiproses: String(r[C.TGL_DIPROSES] || ''),
  };
}

// ── GET: admin lihat SEMUA pengajuan; pegawai lihat PUNYA SENDIRI saja ──
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin', 'pegawai_bnn']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const rows = await getSheetData(SHEET);
    let data = rows.filter(r => r[C.ID]).map(mapRow);

    // Pegawai cuma boleh lihat pengajuan miliknya sendiri (berdasarkan NIP di sesi)
    if (session.role === 'pegawai_bnn') {
      const nipSesi = String((session as { nip?: string }).nip || '').trim();
      data = data.filter(d => d.nip === nipSesi);
    }

    data.sort((a, b) => new Date(b.tglDiajukan).getTime() - new Date(a.tglDiajukan).getTime());

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: pegawai mengajukan pendampingan hukum baru ──
export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['pegawai_bnn']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login sebagai Pegawai BNN.' }, { status: 401 });
  }

  try {
    const { nama, email, tglKejadian, waktuKejadian, tempatKejadian, pasal, deskripsi } = await req.json();

    if (!nama?.trim()) return NextResponse.json({ message: 'Nama wajib diisi.' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ message: 'Email valid wajib diisi — dipakai admin untuk mengirim info status.' }, { status: 400 });
    }
    if (!tglKejadian) return NextResponse.json({ message: 'Tanggal kejadian wajib diisi.' }, { status: 400 });
    if (!waktuKejadian?.trim()) return NextResponse.json({ message: 'Waktu kejadian wajib diisi.' }, { status: 400 });
    if (!tempatKejadian?.trim()) return NextResponse.json({ message: 'Tempat kejadian wajib diisi.' }, { status: 400 });
    if (!pasal?.trim()) return NextResponse.json({ message: 'Pasal yang berlaku wajib diisi.' }, { status: 400 });
    if (!deskripsi?.trim()) return NextResponse.json({ message: 'Deskripsi kejadian wajib diisi.' }, { status: 400 });

    const nip = String((session as { nip?: string }).nip || '');
    const lokasiBnn = String((session as { lokasi?: string }).lokasi || ''); // dikunci dari data akun, BUKAN input pegawai
    const id = generateId('PDH');
    const now = formatTanggalWaktu(new Date());

    await appendRow(SHEET, [
      id, nip, nama.trim(), lokasiBnn, email.trim(), tglKejadian, waktuKejadian.trim(), tempatKejadian.trim(),
      pasal.trim(), deskripsi.trim(), 'Diajukan', now, '', '', '',
    ]);

    return NextResponse.json({
      message: 'Pengajuan pendampingan hukum berhasil dikirim. Admin akan segera meninjau.',
      data: {
        id, nip, nama: nama.trim(), lokasiBnn, email: email.trim(), tglKejadian, waktuKejadian: waktuKejadian.trim(),
        tempatKejadian: tempatKejadian.trim(), pasal: pasal.trim(), deskripsi: deskripsi.trim(),
        status: 'Diajukan', tglDiajukan: now, diprosesOleh: '', catatanAdmin: '', tglDiproses: '',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: admin ubah status pengajuan ──
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { id, statusBaru, catatanAdmin, diprosesOleh } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID pengajuan wajib diisi.' }, { status: 400 });
    if (!STATUS_VALID.includes(statusBaru)) {
      return NextResponse.json({ message: 'Status tidak dikenali.' }, { status: 400 });
    }
    // Penolakan WAJIB disertai alasan — pegawai berhak tau kenapa pengajuannya ditolak.
    if (statusBaru === 'Ditolak' && !catatanAdmin?.trim()) {
      return NextResponse.json({ message: 'Alasan penolakan wajib diisi.' }, { status: 400 });
    }

    const rows = await getSheetData(SHEET);
    const idx = rows.findIndex(r => String(r[C.ID]).trim() === String(id).trim());
    if (idx === -1) return NextResponse.json({ message: 'Pengajuan tidak ditemukan.' }, { status: 404 });

    const rowNumber = idx + 2;
    const statusSkrg = String(rows[idx][C.STATUS] || 'Diajukan');

    // Validasi transisi — boleh maju satu tahap, atau langsung "Ditolak" dari mana saja
    // selama belum "Selesai"/"Ditolak" (alasan kenapa BUKAN transisi maju biasa: penolakan
    // adalah keputusan final, bukan bagian dari urutan linear).
    if (statusBaru !== 'Ditolak' && !['Selesai', 'Ditolak'].includes(statusSkrg)) {
      const posSkrg = URUTAN_STATUS.indexOf(statusSkrg);
      const posBaru = URUTAN_STATUS.indexOf(statusBaru);
      if (posBaru !== posSkrg + 1 && statusBaru !== statusSkrg) {
        return NextResponse.json({ message: `Transisi dari "${statusSkrg}" ke "${statusBaru}" tidak diizinkan.` }, { status: 400 });
      }
    } else if (['Selesai', 'Ditolak'].includes(statusSkrg)) {
      return NextResponse.json({ message: `Pengajuan sudah "${statusSkrg}" — tidak bisa diubah lagi.` }, { status: 400 });
    }

    await updateCell(SHEET, rowNumber, C.STATUS + 1, statusBaru);
    await updateCell(SHEET, rowNumber, C.DIPROSES_OLEH + 1, diprosesOleh || '');
    await updateCell(SHEET, rowNumber, C.CATATAN_ADMIN + 1, catatanAdmin || '');
    await updateCell(SHEET, rowNumber, C.TGL_DIPROSES + 1, formatTanggalWaktu(new Date()));

    // Kirim email status ke pegawai — biar admin TIDAK PERLU buka sistem lagi
    // buat kasih tau progres, semua otomatis lewat email. Gagal kirim TIDAK
    // menggagalkan update status (status tetap tersimpan), cuma dicatat di log.
    const emailTujuan = String(rows[idx][C.EMAIL] || '');
    if (emailTujuan) {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'kirimEmailStatusPendampingan',
            email: emailTujuan,
            nama: String(rows[idx][C.NAMA] || ''),
            statusBaru, catatanAdmin: catatanAdmin || '',
            tempatKejadian: String(rows[idx][C.TEMPAT_KEJADIAN] || ''),
          }),
          redirect: 'follow',
        });
      } catch (e) {
        console.error('[PENDAMPINGAN_HUKUM] Gagal kirim email status:', e);
      }
    }

    return NextResponse.json({ message: `Status berhasil diperbarui menjadi "${statusBaru}".` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}