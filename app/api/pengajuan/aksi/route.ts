import { NextRequest, NextResponse } from 'next/server';
import { appendRow, findRow, updateCell } from '@/lib/sheet';
import { generateId, generateKodeAkses, formatTanggal, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const PCOL = {
  ID: 0, ID_MITRA: 1, NAMA_MITRA: 2, JENIS: 3, ARAH: 4, PERIHAL: 5,
  TGL: 6, STATUS: 7, ALASAN: 8, KODE_TRACKING: 9, ID_DOKUMEN: 10, DICATAT_OLEH: 11,
};

export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { id, action, alasan } = await req.json();

    if (!id || !action) {
      return NextResponse.json({ message: 'ID dan action wajib diisi.' }, { status: 400 });
    }
    if (!['terima', 'tolak'].includes(action)) {
      return NextResponse.json({ message: 'Action tidak dikenali.' }, { status: 400 });
    }

    const found = await findRow('Pengajuan Mitra', PCOL.ID, id);
    if (!found) {
      return NextResponse.json({ message: 'Pengajuan tidak ditemukan.' }, { status: 404 });
    }

    const currentStatus = String(found.data[PCOL.STATUS]).trim();
    if (currentStatus !== 'Review dalam proses') {
      return NextResponse.json({ message: `Pengajuan ini sudah diproses sebelumnya (${currentStatus}).` }, { status: 409 });
    }

    if (action === 'tolak') {
      if (!alasan?.trim()) {
        return NextResponse.json({ message: 'Alasan penolakan wajib diisi.' }, { status: 400 });
      }
      await updateCell('Pengajuan Mitra', found.rowNumber, PCOL.STATUS + 1, 'Ditolak');
      await updateCell('Pengajuan Mitra', found.rowNumber, PCOL.ALASAN + 1, alasan.trim());
      return NextResponse.json({ message: 'Pengajuan ditolak.' });
    }

    const namaMitra = String(found.data[PCOL.NAMA_MITRA]);
    const idMitra   = String(found.data[PCOL.ID_MITRA] || '');
    const jenis     = String(found.data[PCOL.JENIS]);
    const perihal   = String(found.data[PCOL.PERIHAL]);

    const now = new Date();
    const idDokumen  = generateId(jenis);
    const kodeAkses  = generateKodeAkses(jenis);
    const kodeExpire = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const tglBerlaku  = now;
    const tglBerakhir = new Date(now);
    tglBerakhir.setFullYear(tglBerakhir.getFullYear() + 5);

    await appendRow('Dokumen Kerja sama', [
      idDokumen, jenis, perihal, idMitra, namaMitra,
      formatTanggalWaktu(now),
      formatTanggal(tglBerlaku),
      formatTanggal(tglBerakhir),
      5, 'Draft', kodeAkses, formatTanggalWaktu(kodeExpire),
      '', '', 'Admin Pokja', `Dari pengajuan ${id}`, '', '',
    ]);

    await updateCell('Pengajuan Mitra', found.rowNumber, PCOL.STATUS + 1, 'Diterima');
    await updateCell('Pengajuan Mitra', found.rowNumber, PCOL.ID_DOKUMEN + 1, idDokumen);

    return NextResponse.json({
      message: 'Pengajuan diterima. Kode akses draft berhasil dibuat.',
      idDokumen,
      kodeAkses,
      kodeExpire: formatTanggalWaktu(kodeExpire),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}