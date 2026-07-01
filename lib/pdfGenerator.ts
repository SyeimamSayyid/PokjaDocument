// lib/pdfGenerator.ts
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

// Generate PDF kualitas tinggi dari Google Docs via Apps Script.
// Mengembalikan base64 (untuk diunduh user) + simpan versi di Drive (anti-duplikat).
export async function generatePdfTinggi(params: {
  docsId:    string;
  idDokumen: string;
  namaFile?: string;
}): Promise<{
  pdfBase64:   string;
  namaFile:    string;
  pdfDriveId:  string;
  pdfDriveUrl: string;
}> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generatePdf', ...params }),
    redirect: 'follow',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apps Script error (${res.status}): ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || data.error || 'Gagal generate PDF');
  }

  return {
    pdfBase64:   data.pdfBase64,
    namaFile:    data.namaFile,
    pdfDriveId:  data.pdfDriveId,
    pdfDriveUrl: data.pdfDriveUrl,
  };
}