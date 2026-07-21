import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, replaceSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

const SHEET_MASTER = 'Data Pegawai BNN Master';

// Pola nama sheet -> label lokasi. Kalau nama sheet di Excel tidak cocok
// pola manapun, dipakai APA ADANYA (nama sheet asli) sebagai lokasi.
const POLA_LOKASI: { pola: RegExp; label: string }[] = [
  { pola: /BNNP/i, label: 'BNNP Sulsel' },
  { pola: /PALOPO/i, label: 'BNNK Palopo' },
  { pola: /TORAJA/i, label: 'BNNK Toraja' },
  { pola: /BONE/i, label: 'BNNK Bone' },
  { pola: /SIDRAP/i, label: 'BNNK Sidrap' },
];

function tebakLokasi(namaSheet: string): string {
  const match = POLA_LOKASI.find(p => p.pola.test(namaSheet));
  return match ? match.label : namaSheet.trim();
}

function normNip(v: unknown): string {
  return String(v || '').replace(/\D/g, '');
}

interface BarisMaster { nip: string; nama: string; lokasi: string; status: string; }

function ekstrakSemuaSheet(workbook: XLSX.WorkBook): { data: BarisMaster[]; ringkasan: { sheet: string; jumlah: number }[] } {
  const hasil: BarisMaster[] = [];
  const ringkasan: { sheet: string; jumlah: number }[] = [];

  for (const namaSheet of workbook.SheetNames) {
    const ws = workbook.Sheets[namaSheet];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Cari baris header — baris yang salah satu selnya persis "NAMA" (case-insensitive)
    let headerRowIdx = -1;
    let headerRow: unknown[] = [];
    for (let i = 0; i < Math.min(rows.length, 6); i++) {
      const row = rows[i] || [];
      if (row.some(c => String(c || '').trim().toUpperCase() === 'NAMA')) {
        headerRowIdx = i;
        headerRow = row;
        break;
      }
    }
    if (headerRowIdx === -1) continue; // sheet ini bukan daftar pegawai (mis. sheet rekap statistik)

    const headers = headerRow.map(c => String(c || '').trim().toUpperCase());
    const idxNama = headers.findIndex(h => h === 'NAMA');
    const idxNip = headers.findIndex(h => h.includes('NIP') || h.includes('NRP'));
    if (idxNama === -1 || idxNip === -1) continue;

    const lokasi = tebakLokasi(namaSheet);
    let jumlahSheet = 0;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const namaRaw = row[idxNama];
      const nipRaw = row[idxNip];
      if (!namaRaw || !nipRaw) continue;
      const nip = normNip(nipRaw);
      if (nip.length < 6) continue;
      hasil.push({ nip, nama: String(namaRaw).trim(), lokasi, status: 'Aktif' });
      jumlahSheet++;
    }

    if (jumlahSheet > 0) ringkasan.push({ sheet: namaSheet, jumlah: jumlahSheet });
  }

  return { data: hasil, ringkasan };
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ message: 'File Excel wajib diupload.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const { data: dataMentah, ringkasan } = ekstrakSemuaSheet(workbook);

    // Dedup berdasarkan NIP — kalau NIP yang sama muncul di lebih dari satu
    // sheet (biasa terjadi kalau ada rekap gabungan + rekap per-unit di
    // Excel yang sama), cuma kemunculan PERTAMA yang disimpan.
    const nipTerlihat = new Set<string>();
    const data = dataMentah.filter(d => {
      if (nipTerlihat.has(d.nip)) return false;
      nipTerlihat.add(d.nip);
      return true;
    });
    const jumlahDuplikat = dataMentah.length - data.length;

    if (data.length === 0) {
      return NextResponse.json({
        message: 'Tidak ada data pegawai yang bisa diekstrak. Pastikan ada sheet dengan kolom "NAMA" dan "NIP"/"NRP".',
      }, { status: 400 });
    }

    // Ganti SELURUH isi sheet Data Pegawai BNN Master (bukan ditambahkan) —
    // biar tidak ada data ganda dari upload sebelumnya yang sudah usang.
    // Ditulis pakai updateCell/appendRow (bukan fungsi "clear sheet" khusus,
    // karena tidak yakin itu tersedia) — timpa baris lama satu-satu dulu,
    // baris sisa (kalau data lama lebih panjang dari data baru) dikosongkan,
    // baru appendRow buat sisa data baru yang belum tertampung.
    // Ganti SELURUH isi sheet Data Pegawai BNN Master dalam 1-2 panggilan
    // API saja (clear + batch write), bukan ratusan panggilan satu-satu —
    // jauh lebih cepat (hitungan detik, bukan menit) dan tidak berisiko timeout.
    await replaceSheetData(SHEET_MASTER, data.map(d => [d.nip, d.nama, d.lokasi, d.status]));

    return NextResponse.json({
      message: `Data Pegawai BNN Master berhasil diperbarui — ${data.length} pegawai dari ${ringkasan.length} sheet.${jumlahDuplikat > 0 ? ` (${jumlahDuplikat} NIP duplikat antar-sheet dilewati)` : ''}`,
      ringkasan,
      total: data.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }
  try {
    const rows = await getSheetData(SHEET_MASTER);
    const total = rows.filter(r => r[0]).length;
    return NextResponse.json({ total });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}