// lib/sheet.ts
import { google } from 'googleapis';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  });
}

// Konversi nomor kolom (1-based) → huruf kolom spreadsheet.
// Mendukung lebih dari 26 kolom (A..Z, AA, AB, ...). 1->A, 26->Z, 27->AA.
function colToLetter(col: number): string {
  let s = '';
  while (col > 0) {
    const m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s || 'A';
}

export async function getSheetData(sheetName: string): Promise<string[][]> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A2:AZ`,
    });

    return (res.data.values as string[][]) || [];
  } catch (error) {
    console.error(`Error getting data from ${sheetName}:`, error);
    return [];
  }
}

export async function appendRow(sheetName: string, values: unknown[]): Promise<void> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
  } catch (error) {
    console.error(`Error appending row to ${sheetName}:`, error);
  }
}

export async function updateCell(
  sheetName: string,
  row: number,
  col: number,
  value: unknown
): Promise<void> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const colLetter = colToLetter(col); // mendukung kolom > Z (AA, AB, ...)

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!${colLetter}${row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[value]] },
    });
  } catch (error) {
    console.error(`Error updating cell in ${sheetName}:`, error);
  }
}

// ── Kolom Dokumen Kerja sama (0-based) ─────────────────────
// 0 ID, 1 Jenis, 2 Judul, 3 ID Mitra, 4 Nama Mitra, 5 Tgl Dibuat,
// 6 Tgl Berlaku, 7 Tgl Berakhir, 8 Durasi, 9 Status, 10 Kode, ...
const DOK = { ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_BERLAKU:6, TGL_BERAKHIR:7, STATUS:9 };

// Fungsi khusus untuk Dashboard Superadmin
export async function getDashboardStats() {
  try {
    const adminData      = await getSheetData('Admin');
    const mitraData      = await getSheetData('Mitra');
    const dokumenData    = await getSheetData('Dokumen Kerja sama');
    const dataStatistik  = await getSheetData('Data statistik');

    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    const totalAdminAktif = adminData.filter(row => row[4]?.toLowerCase() === 'aktif').length;
    const totalMitra = mitraData.length;

    // Dokumen aktif (belum kedaluwarsa) — pakai tgl berakhir kolom 7
    const totalMouPksAktif = dokumenData.filter(row => {
      if (!row[DOK.TGL_BERAKHIR]) return false;
      const tglBerakhir = new Date(row[DOK.TGL_BERAKHIR]);
      return tglBerakhir > now;
    }).length;

    const hampirBerakhir = dokumenData.filter(row => {
      if (!row[DOK.TGL_BERAKHIR]) return false;
      const tglBerakhir = new Date(row[DOK.TGL_BERAKHIR]);
      return tglBerakhir > now && tglBerakhir < threeMonthsFromNow;
    }).length;

    // Status di kolom 9
    const totalDraft = dokumenData.filter(row => row[DOK.STATUS]?.toLowerCase() === 'draft').length;
    const totalReview = dokumenData.filter(row => {
      const s = row[DOK.STATUS]?.toLowerCase();
      return s === 'dalam proses' || s === 'review';
    }).length;
    const totalKedaluwarsa = dokumenData.filter(row => {
      if (!row[DOK.TGL_BERAKHIR]) return false;
      const tglBerakhir = new Date(row[DOK.TGL_BERAKHIR]);
      return tglBerakhir < now;
    }).length;

    let totalLaporanImplementasi = 0;
    let totalFotoUpload = 0;
    let totalAudiens = 0;
    let mouBulanIni = 0;
    let pksBulanIni = 0;
    let mitraBulanIni = 0;

    if (dataStatistik.length > 0) {
      totalLaporanImplementasi = parseInt(dataStatistik[0]?.[1]) || 0;
      totalFotoUpload = parseInt(dataStatistik[0]?.[2]) || 0;
      totalAudiens = parseInt(dataStatistik[0]?.[3]) || 0;
      mouBulanIni = parseInt(dataStatistik[0]?.[4]) || 0;
      pksBulanIni = parseInt(dataStatistik[0]?.[5]) || 0;
      mitraBulanIni = parseInt(dataStatistik[0]?.[6]) || 0;
    }

    // Chart MOU/PKS per bulan — pakai tgl berlaku (kolom 6) & jenis (kolom 1)
    const monthlyData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
      mou: new Array(12).fill(0),
      pks: new Array(12).fill(0),
      exp: new Array(12).fill(0),
    };

    dokumenData.forEach(row => {
      if (row[DOK.TGL_BERLAKU]) {
        const tglMulai = new Date(row[DOK.TGL_BERLAKU]);
        const bulan = tglMulai.getMonth();
        const jenis = row[DOK.JENIS]?.toUpperCase();
        if (!isNaN(bulan)) {
          if (jenis === 'MOU') monthlyData.mou[bulan]++;
          if (jenis === 'PKS' || jenis === 'MOA') monthlyData.pks[bulan]++;
        }
      }
      if (row[DOK.TGL_BERAKHIR]) {
        const tglBerakhir = new Date(row[DOK.TGL_BERAKHIR]);
        const bln = tglBerakhir.getMonth();
        if (tglBerakhir < now && !isNaN(bln)) monthlyData.exp[bln]++;
      }
    });

    // Data Admin — dokumen dikelola dicocokkan ke nama mitra (kolom 4)
    const adminList = adminData.map((row, idx) => ({
      id: idx + 1,
      nama: row[1] || 'Unknown',
      username: row[2] || '',
      dokumenKelola: dokumenData.filter(d => d[DOK.NAMA_MITRA] === row[1]).length,
      status: row[4] === 'Aktif' ? 'Aktif' : 'Nonaktif',
    })).slice(0, 5);

    // Data Mitra — dokumen dicocokkan ke ID Mitra (kolom 3)
    const mitraList = mitraData.map((row, idx) => {
      const mitraDokumen = dokumenData.filter(d => d[DOK.ID_MITRA] === row[0]);
      const jenisCount: Record<string, number> = {};
      mitraDokumen.forEach(d => {
        const jenis = d[DOK.JENIS] || 'MOU';
        jenisCount[jenis] = (jenisCount[jenis] || 0) + 1;
      });
      const jenisUtama = Object.keys(jenisCount)[0] || 'MOU';
      const jumlah = mitraDokumen.length;

      return {
        id: idx + 1,
        nama: row[1] || 'Unknown',
        jenis: jenisUtama,
        jumlah,
        avatar: (row[1] || 'PT').substring(0, 2).toUpperCase(),
        kelas: `av-${String.fromCharCode(97 + (idx % 6))}`,
      };
    }).slice(0, 6);

    return {
      stats: {
        totalAdminAktif,
        totalMitra,
        totalMouPksAktif,
        totalMouPksKedaluwarsa: totalKedaluwarsa,
        totalDraft,
        totalReview,
        totalLaporanImplementasi,
        totalFotoUpload,
        totalAudiens,
      },
      trends: {
        mouBaru: mouBulanIni,
        pksBaru: pksBulanIni,
        berakhir: totalKedaluwarsa,
        mitraBaru: mitraBulanIni,
        persenPerubahanMitra: totalMitra > 0 ? (mitraBulanIni / totalMitra) * 100 : 0,
        persenPerubahanDokumen: totalMouPksAktif > 0 ? (mouBulanIni + pksBulanIni) / totalMouPksAktif * 100 : 0,
      },
      chartData: monthlyData,
      adminList,
      mitraList,
      hampirBerakhir,
      totalDokumen: dokumenData.length,
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      stats: {
        totalAdminAktif: 0, totalMitra: 0, totalMouPksAktif: 0,
        totalMouPksKedaluwarsa: 0, totalDraft: 0, totalReview: 0,
        totalLaporanImplementasi: 0, totalFotoUpload: 0, totalAudiens: 0,
      },
      trends: {
        mouBaru: 0, pksBaru: 0, berakhir: 0, mitraBaru: 0,
        persenPerubahanMitra: 0, persenPerubahanDokumen: 0,
      },
      chartData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
        mou: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        pks: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        exp: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      adminList: [],
      mitraList: [],
      hampirBerakhir: 0,
      totalDokumen: 0,
    };
  }
}

export async function findRow(
  sheetName: string,
  colIndex: number,
  value: string
): Promise<{ rowNumber: number; data: string[] } | null> {
  const rows = await getSheetData(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][colIndex]).trim() === value.trim()) {
      return { rowNumber: i + 2, data: rows[i] };
    }
  }
  return null;
}

export async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  const auth   = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
  });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  const sheetId = sheet?.properties?.sheetId ?? 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex:   rowIndex,
          },
        },
      }],
    },
  });
}

// ── BATCH REPLACE — ganti SELURUH isi sebuah sheet (dari baris 2, sisakan
// header baris 1) dalam CUMA 2 panggilan API (1x clear + 1x write banyak
// baris sekaligus), bukan 1 panggilan per sel/baris seperti updateCell/
// appendRow. Dipakai buat kasus "replace semua data" seperti import Excel —
// appendRow/updateCell yang dipanggil ratusan kali itu LAMBAT (bisa menitan)
// dan berisiko timeout, sementara ini cuma butuh 1-2 detik. ──────────────
export async function replaceSheetData(sheetName: string, values: unknown[][]): Promise<void> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Kosongkan dulu semua data lama (baris 2 ke bawah, sisakan header).
    // Range dibuat cukup lebar (A:Z) dan panjang (sampai baris 20000) biar
    // aman menampung sisa data lama walau lebih banyak dari data baru.
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A2:Z20000`,
    });

    if (values.length === 0) return;

    // Tulis SEMUA baris baru sekaligus — 1 panggilan API, bukan looping.
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (error) {
    console.error(`Error replacing data in ${sheetName}:`, error);
    throw error;
  }
}