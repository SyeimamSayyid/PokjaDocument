import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity.readonly',
];
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });
}

async function callAppsScript(payload: object) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apps Script error (${res.status}): ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || data.error || 'Apps Script gagal');
  }
  return data;
}

// ── Buat Docs + Folder (MOU/PKS terpisah) + Foto_Kegiatan ──
export async function buatDariTemplate(params: {
  jenis:           'MOU' | 'PKS';
  idDokumen:       string;
  idMitra:         string;
  namaMitra:       string;
  namaPIC:         string;
  jabatanPIC:      string;
  perihal:         string;
  tanggalBerlaku:  string;
  tanggalBerakhir: string;
  durasiTahun:     number;
  kodeAkses:       string;
  templateMitraId?: string; // ← TAMBAH INI
}): Promise<{ docsId: string; docsUrl: string; folderId: string; fotoFolderId: string }> {
  const data = await callAppsScript({ action: 'buatDokumen', ...params });
  return {
    docsId:       data.docsId,
    docsUrl:      data.docsUrl,
    folderId:     data.folderId,
    fotoFolderId: data.fotoFolderId,
  };
}

// ── Cek kuota terpakai (real-time via Drive) ──
export async function cekKuotaFoto(fotoFolderId: string): Promise<{
  terpakai: number; maksimal: number; persenTerpakai: number; sisaBytes: number;
}> {
  const data = await callAppsScript({ action: 'cekKuota', fotoFolderId });
  return {
    terpakai:       data.terpakai,
    maksimal:       data.maksimal,
    persenTerpakai: data.persenTerpakai,
    sisaBytes:      data.sisaBytes,
  };
}

// ── Upload foto (base64) dengan validasi kuota 5MB ──
export async function uploadFotoKegiatan(params: {
  fotoFolderId: string;
  namaFile:     string;
  base64Data:   string;
  mimeType:     string;
}): Promise<{
  fileId: string; fileUrl: string; namaFile: string; ukuranFile: number;
  terpakai: number; maksimal: number; persenTerpakai: number;
}> {
  const data = await callAppsScript({ action: 'uploadFoto', ...params });
  return data;
}

// ── List semua foto di folder ──
export async function listFotoKegiatan(fotoFolderId: string): Promise<{
  files: Array<{ fileId: string; nama: string; ukuran: number; url: string; thumbnailUrl: string; tanggalUpload: string }>;
  terpakai: number; maksimal: number; persenTerpakai: number;
}> {
  const data = await callAppsScript({ action: 'listFoto', fotoFolderId });
  return data;
}

// ── Hapus foto ──
export async function hapusFotoKegiatan(params: {
  fileId: string; fotoFolderId: string;
}): Promise<{ terpakai: number; maksimal: number; persenTerpakai: number }> {
  const data = await callAppsScript({ action: 'hapusFoto', ...params });
  return data;
}

// ── Hapus dokumen/folder dari Drive (best-effort) ──
export async function hapusDariDrive(fileId: string): Promise<void> {
  const auth  = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  try {
    await drive.files.delete({ fileId });
  } catch {
    // Service Account mungkin bukan owner, abaikan
  }
}

// ── Set permission writer untuk file/folder spesifik (tanpa hak share) ──
export async function setWriterPermission(fileId: string, email?: string): Promise<void> {
  const auth  = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'writer',
      type: email ? 'user' : 'anyone',
      ...(email ? { emailAddress: email } : {}),
    },
    sendNotificationEmail: false,
  });
}

// ════════════════════════════════════════════════════════════
//  DRIVE ACTIVITY API — Polling siapa edit terakhir
// ════════════════════════════════════════════════════════════

interface LastActivity {
  ditemukan:   boolean;
  aktor:       string;      // nama/email aktor
  aksi:        string;      // 'edit' | 'create' | 'comment' | dll
  waktu:       string;      // ISO timestamp
  isAnonymous: boolean;      // true jika aktor tidak terdeteksi (mitra tanpa akun Google)
}

export async function getLastActivity(docsId: string): Promise<LastActivity> {
  const auth     = getAuth();
  const activity = google.driveactivity({ version: 'v2', auth });

  try {
    const res = await activity.activity.query({
      requestBody: {
        itemName: `items/${docsId}`,
        pageSize: 10,
        consolidationStrategy: { legacy: {} },
      },
    });

    const activities = res.data.activities || [];
    if (activities.length === 0) {
      return { ditemukan: false, aktor: '', aksi: '', waktu: '', isAnonymous: false };
    }

    // Ambil aktivitas paling baru (index 0)
    const latest = activities[0];
    const timestamp = latest.timestamp || latest.timeRange?.endTime || '';

    // Tentukan jenis aksi
    let aksi = 'edit';
    if (latest.primaryActionDetail?.create) aksi = 'create';
    else if (latest.primaryActionDetail?.edit) aksi = 'edit';
    else if (latest.primaryActionDetail?.comment) aksi = 'comment';
    else if (latest.primaryActionDetail?.permissionChange) aksi = 'permission';

    // Tentukan aktor
    const actorInfo = latest.actors?.[0];
    let aktor = 'Tidak diketahui';
    let isAnonymous = false;

    if (actorInfo?.user?.knownUser) {
      // Aktor adalah user Google yang terdeteksi (biasanya Service Account atau akun ber-login)
      aktor = actorInfo.user.knownUser.personName || 'Service Account';
    } else if (actorInfo?.anonymous) {
      // Aktor tidak terdeteksi identitasnya (umum terjadi untuk akses via link tanpa login)
      aktor = 'Pengguna (tanpa akun Google)';
      isAnonymous = true;
    } else if (actorInfo?.impersonation) {
      aktor = 'Sistem (impersonation)';
    }

    return {
      ditemukan: true,
      aktor,
      aksi,
      waktu: timestamp,
      isAnonymous,
    };
  } catch (err) {
    console.error('[DRIVE ACTIVITY]', err);
    return { ditemukan: false, aktor: '', aksi: '', waktu: '', isAnonymous: false };
  }
}