import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, VerticalAlign, ShadingType, BorderStyle,
  SectionType, PageOrientation, ImageRun, HeightRule,
} from 'docx';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const DOK_COL = {
  ID: 0, JENIS: 1, JUDUL: 2, ID_MITRA: 3, NAMA_MITRA: 4,
  TGL_BERLAKU: 6, TGL_BERAKHIR: 7, DURASI: 8, DOCS_URL: 13,
  DIVISI: 23,
};
const PJ_COL = { ID_MITRA: 1, NAMA: 2, EMAIL: 7, WA: 8, PIC: 18 };
const ARS_COL = {
  ID: 0, NAMA_INSTITUSI: 1, JENIS: 2, JUDUL: 3, TGL_BERLAKU: 4, TGL_BERAKHIR: 5,
  FILE_URL: 7, PIC: 9, EMAIL: 10, WA: 11, TGL_ARSIP: 14, DIVISI: 16,
};

// Dimensi A4 dalam DXA (satuan Word). Portrait: 11906 x 16838.
// docx-js akan menukar width/height sendiri saat orientation LANDSCAPE diset.
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;

// Palet laporan — biru tegas biar kelihatan resmi & profesional, konsisten
// dengan tema Sky yang dipakai di seluruh dashboard.
const WARNA_HEADER = '1E3A5F'; // biru navy gelap — header tabel utama
const WARNA_AKSEN = '4A7FB5';  // biru sedang — kartu ringkasan
const WARNA_TERANG = 'EAF2FC'; // biru sangat muda — baris genap/latar kartu

function normNama(s: unknown): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveKontak(idMitra: string, namaInstitusi: string, pjRows: string[][]) {
  let matches = idMitra ? pjRows.filter(r => String(r[PJ_COL.ID_MITRA] || '').trim() === idMitra) : [];
  if (matches.length === 0 && namaInstitusi) {
    const target = normNama(namaInstitusi);
    matches = pjRows.filter(r => normNama(r[PJ_COL.NAMA]) === target);
  }
  let namaPIC = '', email = '', wa = '';
  for (const r of matches) {
    if (r[PJ_COL.PIC]) namaPIC = String(r[PJ_COL.PIC]).trim();
    if (r[PJ_COL.EMAIL]) email = String(r[PJ_COL.EMAIL]).trim();
    if (r[PJ_COL.WA]) wa = String(r[PJ_COL.WA]).trim();
  }
  return { namaPIC, email, wa };
}

interface BarisLaporan {
  no: number; sumber: 'Sistem' | 'Arsip'; tglBerlaku: string; jenis: string; instansi: string; judul: string;
  namaPIC: string; noPIC: string; emailPIC: string;
  bidang: { pemberantasan: boolean; rehabilitasi: boolean; pencegahan: boolean; pemberdayaan: boolean };
  durasi: string; tglBerakhir: string;
  fileUrl: string; // link ke file (Docs sistem / file arsip) — sumber buat QR code
  qrCode?: string; // data URL base64 QR code, diisi belakangan (di-generate async)
}

async function ambilData(tahun: number, sumberFilter: 'semua' | 'sistem' | 'arsip' = 'semua'): Promise<BarisLaporan[]> {
  const [dokRows, pjRowsRaw, arsipRows] = await Promise.all([
    getSheetData('Dokumen Kerja sama'),
    getSheetData('Pengajuan Mitra').catch(() => []),
    getSheetData('Arsip Dokumen').catch(() => []),
  ]);
  const pjRows: string[][] = pjRowsRaw || [];

  // Dokumen SISTEM — tetap difilter dari Tanggal Berlaku (itu memang
  // acuan "kapan kerja sama ini berlaku", beda konteks dari arsip).
  const dokFiltered = dokRows.filter(r => {
    if (!r[DOK_COL.ID]) return false;
    const tgl = new Date(String(r[DOK_COL.TGL_BERLAKU]));
    return !isNaN(tgl.getTime()) && tgl.getFullYear() === tahun;
  });

  const dataSistem = dokFiltered.map(r => {
    const idMitra = String(r[DOK_COL.ID_MITRA] || '').trim();
    const namaInstitusi = String(r[DOK_COL.NAMA_MITRA] || '').trim();
    const kontak = resolveKontak(idMitra, namaInstitusi, pjRows);
    const divisiRaw = String(r[DOK_COL.DIVISI] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return {
      sumber: 'Sistem' as const,
      tglBerlaku: String(r[DOK_COL.TGL_BERLAKU] || ''),
      jenis: String(r[DOK_COL.JENIS] || ''),
      instansi: namaInstitusi,
      judul: String(r[DOK_COL.JUDUL] || ''),
      namaPIC: kontak.namaPIC, noPIC: kontak.wa, emailPIC: kontak.email,
      bidang: {
        pemberantasan: divisiRaw.includes('pemberantasan'), rehabilitasi: divisiRaw.includes('rehabilitasi'),
        pencegahan: divisiRaw.includes('pencegahan'), pemberdayaan: divisiRaw.includes('pemberdayaan'),
      },
      durasi: String(r[DOK_COL.DURASI] || ''), tglBerakhir: String(r[DOK_COL.TGL_BERAKHIR] || ''),
      fileUrl: String(r[DOK_COL.DOCS_URL] || ''),
    };
  });

  // Dokumen ARSIP — sesuai permintaan, difilter dari TANGGAL MASUK (kapan
  // diarsipkan), BUKAN tanggal berlaku. Ini beda cerita dari dokumen sistem:
  // yang penting di sini "kapan masuk arsip", bukan "kapan kerja sama berlaku".
  const arsipFiltered = (arsipRows || []).filter(r => {
    if (!r[ARS_COL.ID]) return false;
    const tglMasuk = new Date(String(r[ARS_COL.TGL_ARSIP]));
    return !isNaN(tglMasuk.getTime()) && tglMasuk.getFullYear() === tahun;
  });

  const dataArsip = arsipFiltered.map(r => {
    const divisiRaw = String(r[ARS_COL.DIVISI] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return {
      sumber: 'Arsip' as const,
      tglBerlaku: String(r[ARS_COL.TGL_BERLAKU] || ''),
      jenis: String(r[ARS_COL.JENIS] || ''),
      instansi: String(r[ARS_COL.NAMA_INSTITUSI] || ''),
      judul: String(r[ARS_COL.JUDUL] || ''),
      namaPIC: String(r[ARS_COL.PIC] || ''), noPIC: String(r[ARS_COL.WA] || ''), emailPIC: String(r[ARS_COL.EMAIL] || ''),
      bidang: {
        pemberantasan: divisiRaw.includes('pemberantasan'), rehabilitasi: divisiRaw.includes('rehabilitasi'),
        pencegahan: divisiRaw.includes('pencegahan'), pemberdayaan: divisiRaw.includes('pemberdayaan'),
      },
      durasi: '', tglBerakhir: String(r[ARS_COL.TGL_BERAKHIR] || ''),
      fileUrl: String(r[ARS_COL.FILE_URL] || ''),
    };
  });

  const sumberTerpilih = sumberFilter === 'sistem' ? dataSistem : sumberFilter === 'arsip' ? dataArsip : [...dataSistem, ...dataArsip];
  const gabungan: BarisLaporan[] = sumberTerpilih
    .sort((a, b) => new Date(a.tglBerlaku).getTime() - new Date(b.tglBerlaku).getTime())
    .map((d, i) => ({ no: i + 1, ...d }));

  // Generate QR code (data URL base64) buat tiap baris yang punya fileUrl.
  // Dijalankan paralel (Promise.all) biar tidak lambat kalau datanya banyak.
  await Promise.all(gabungan.map(async d => {
    if (!d.fileUrl) return;
    try {
      d.qrCode = await QRCode.toDataURL(d.fileUrl, { width: 120, margin: 1 });
    } catch { /* biarkan kosong kalau gagal generate, jangan gagalkan seluruh laporan */ }
  }));

  return gabungan;
}

async function ambilPengaturan() {
  const rows = await getSheetData('Pengaturan Laporan');
  const row = rows[0] || [];
  return {
    namaKepala: String(row[0] || '(Nama Kepala belum diisi)'),
    pangkat: String(row[1] || '(Pangkat belum diisi)'),
  };
}

function cellText(text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; shade?: string; width?: number } = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade, color: 'auto' } : undefined,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.CENTER,
      children: [new TextRun({ text, bold: opts.bold, size: opts.size || 16 })],
    })],
  });
}

function headerCell(text: string, widthPct?: number) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.CLEAR, fill: WARNA_HEADER, color: 'auto' },
    margins: { top: 70, bottom: 70, left: 60, right: 60 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 16, color: 'FFFFFF' })],
    })],
  });
}

// Kartu ringkasan bergaya KPI — dibuat dari tabel 1 baris x 4 sel berwarna,
// meniru tampilan kartu statistik di dashboard (dokx tidak punya widget chart
// asli, jadi pendekatan paling dekat adalah sel tabel berwarna + angka besar).
function kartuRingkasan(label: string, angka: string | number, warna: string) {
  return new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: warna, color: 'auto' },
    margins: { top: 180, bottom: 180, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: angka.toString(), bold: true, size: 36, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label.toUpperCase(), size: 14, color: 'FFFFFF' })] }),
    ],
  });
}

async function buatDocx(tahun: number, data: BarisLaporan[], pengaturan: { namaKepala: string; pangkat: string }) {
  const totalMou = data.filter(d => d.jenis.toUpperCase() === 'MOU').length;
  const totalPks = data.filter(d => d.jenis.toUpperCase() === 'PKS').length;
  const totalSistem = data.filter(d => d.sumber === 'Sistem').length;
  const totalArsip = data.filter(d => d.sumber === 'Arsip').length;

  // "Bar chart" horizontal — disimulasikan dari sel tabel berwarna, karena
  // docx tidak punya vector drawing asli kayak pdfkit. Lebar sel berwarna
  // proporsional ke nilainya, sisanya sel putih (biar kelihatan kayak progress bar).
  const barMax = Math.max(1, totalMou, totalPks, totalSistem, totalArsip);
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const;
  const tanpaBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  function barisBar(label: string, nilai: number, warna: string) {
    const persenIsi = Math.max(2, Math.round((nilai / barMax) * 70)); // maks 70% lebar biar ada ruang label
    const sisa = 70 - persenIsi;
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE }, borders: tanpaBorder,
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 16 })] })],
        }),
        new TableCell({
          width: { size: persenIsi, type: WidthType.PERCENTAGE }, borders: tanpaBorder,
          shading: { type: ShadingType.CLEAR, fill: warna, color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
        }),
        new TableCell({
          width: { size: sisa, type: WidthType.PERCENTAGE }, borders: tanpaBorder,
          children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE }, borders: tanpaBorder,
          children: [new Paragraph({ children: [new TextRun({ text: String(nilai), bold: true, size: 18 })] })],
        }),
      ],
    });
  }

  const barChartTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tanpaBorder,
    rows: [
      barisBar('MOU', totalMou, '1E3A5F'),
      barisBar('PKS', totalPks, '4A7FB5'),
      barisBar('Sistem', totalSistem, '5B8BB8'),
      barisBar('Arsip', totalArsip, 'A8C8EA'),
    ],
  });

  const kartuTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' }, right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' }, insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [new TableRow({
      children: [
        kartuRingkasan('Total Kerja Sama', data.length, WARNA_HEADER),
        kartuRingkasan('MOU', totalMou, WARNA_AKSEN),
        kartuRingkasan('PKS', totalPks, WARNA_AKSEN),
        kartuRingkasan('Dari Arsip', totalArsip, '8C5F27'),
      ],
    })],
  });

  const headerRow1 = new TableRow({
    children: [
      headerCell('NO'), headerCell('Sumber'), headerCell('Tanggal Berlaku'), headerCell('Jenis Dokumen'),
      headerCell('Instansi'), headerCell('Judul Dokumen'), headerCell('Nama PIC'),
      headerCell('No PIC'), headerCell('Email PIC'),
      new TableCell({
        columnSpan: 4,
        shading: { type: ShadingType.CLEAR, fill: WARNA_HEADER, color: 'auto' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Bidang Terlibat', bold: true, size: 16, color: 'FFFFFF' })] })],
      }),
      headerCell('Durasi Berlaku'), headerCell('Masa Berakhir Kerja Sama'), headerCell('QR File', 8),
    ],
  });

  const headerRow2 = new TableRow({
    children: [
      ...[0,1,2,3,4,5,6,7,8].map(() => new TableCell({ shading: { type: ShadingType.CLEAR, fill: WARNA_HEADER, color: 'auto' }, children: [new Paragraph('')] })),
      headerCell('Pemberantasan'), headerCell('Rehabilitasi'), headerCell('Pencegahan'), headerCell('Pemberdayaan Masyarakat'),
      new TableCell({ shading: { type: ShadingType.CLEAR, fill: WARNA_HEADER, color: 'auto' }, children: [new Paragraph('')] }),
      new TableCell({ shading: { type: ShadingType.CLEAR, fill: WARNA_HEADER, color: 'auto' }, children: [new Paragraph('')] }),
      new TableCell({ shading: { type: ShadingType.CLEAR, fill: WARNA_HEADER, color: 'auto' }, children: [new Paragraph('')] }),
    ],
  });

  const dataRows = data.length === 0
    ? [new TableRow({
        children: [new TableCell({
          columnSpan: 15,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Data PKS/MOU saat itu tidak ditemukan', italics: true })] })],
        })],
      })]
    : data.map((d, idx) => {
        // Baris genap dikasih tint biru muda — alternating shading biar mudah dibaca
        const shade = idx % 2 === 1 ? WARNA_TERANG : undefined;

        // Sel QR — gambar kalau ada qrCode (base64 data URL), teks "-" kalau tidak.
        let qrCell: TableCell;
        if (d.qrCode) {
          const base64Data = d.qrCode.split(',')[1] || '';
          const imgBuffer = Buffer.from(base64Data, 'base64');
          qrCell = new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: shade ? { type: ShadingType.CLEAR, fill: shade, color: 'auto' } : undefined,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({ data: imgBuffer, transformation: { width: 26, height: 26 }, type: 'png' })],
            })],
          });
        } else {
          qrCell = cellText('-', { shade, width: 8 });
        }

        return new TableRow({
          height: { value: 1000, rule: HeightRule.ATLEAST }, // ruang lebih longgar buat gambar QR, tabel tetap bisa lebih tinggi kalau kontennya panjang
          children: [
            cellText(String(d.no), { shade }),
            cellText(d.sumber, { shade, bold: d.sumber === 'Arsip' }),
            cellText(d.tglBerlaku, { shade }),
            cellText(d.jenis, { shade }),
            cellText(d.instansi, { align: AlignmentType.LEFT, shade }),
            cellText(d.judul, { align: AlignmentType.LEFT, shade }),
            cellText(d.namaPIC, { align: AlignmentType.LEFT, shade }),
            cellText(d.noPIC, { shade }),
            cellText(d.emailPIC, { align: AlignmentType.LEFT, shade }),
            cellText(d.bidang.pemberantasan ? '✓' : '', { shade }),
            cellText(d.bidang.rehabilitasi ? '✓' : '', { shade }),
            cellText(d.bidang.pencegahan ? '✓' : '', { shade }),
            cellText(d.bidang.pemberdayaan ? '✓' : '', { shade }),
            cellText(d.durasi ? `${d.durasi} Tahun` : '-', { shade }),
            cellText(d.tglBerakhir, { shade }),
            qrCell,
          ],
        });
      });

  const tabel = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow1, headerRow2, ...dataRows],
  });

  const landscapePage = { size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: PageOrientation.LANDSCAPE } };

  const doc = new Document({
    sections: [
      {
        properties: { page: landscapePage },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'BADAN NARKOTIKA NASIONAL', bold: true, color: WARNA_HEADER })] }),
          new Paragraph({ children: [new TextRun({ text: 'PROVINSI SULAWESI SELATAN', underline: {}, bold: true, color: WARNA_HEADER })] }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'DATA ARSIP HASIL KERJA SAMA BNNP SULSEL', bold: true, size: 28, color: WARNA_HEADER })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(tahun), bold: true, size: 26, color: WARNA_AKSEN })],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun('SATKER\t\t: BNNP SULSEL')] }),
          new Paragraph({ children: [new TextRun(`TAHUN\t\t: ${tahun}`)] }),
          new Paragraph({ text: '' }), new Paragraph({ text: '' }),
          kartuTable,
          new Paragraph({ text: '' }), new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'Jenis Dokumen', bold: true, color: WARNA_HEADER, size: 20 })] }),
          new Paragraph({ text: '' }),
          barChartTable,
        ],
      },
      {
        properties: { type: SectionType.NEXT_PAGE, page: landscapePage },
        children: [tabel],
      },
      {
        properties: { type: SectionType.NEXT_PAGE, page: landscapePage },
        children: [
          new Paragraph({ text: '' }), new Paragraph({ text: '' }), new Paragraph({ text: '' }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Makassar, ${tahun}`, bold: true })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Kepala Badan Narkotika Nasional', bold: true })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Provinsi Sulawesi Selatan', bold: true })] }),
          new Paragraph({ text: '' }), new Paragraph({ text: '' }), new Paragraph({ text: '' }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: pengaturan.namaKepala, bold: true, underline: {} })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: pengaturan.pangkat, bold: true })] }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function buatPdf(tahun: number, data: BarisLaporan[], pengaturan: { namaKepala: string; pangkat: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const totalMou = data.filter(d => d.jenis.toUpperCase() === 'MOU').length;
    const totalPks = data.filter(d => d.jenis.toUpperCase() === 'PKS').length;
    const totalArsip = data.filter(d => d.sumber === 'Arsip').length;

    // Halaman 1 — cover + kartu ringkasan berwarna
    doc.fillColor('#1E3A5F').fontSize(11).text('BADAN NARKOTIKA NASIONAL');
    doc.text('PROVINSI SULAWESI SELATAN', { underline: true });
    doc.moveDown(2);
    doc.fontSize(16).text('DATA ARSIP HASIL KERJA SAMA BNNP SULSEL', { align: 'center' });
    doc.fillColor('#4A7FB5').fontSize(14).text(String(tahun), { align: 'center' });
    doc.moveDown(1);
    doc.fillColor('#000').fontSize(11).text(`SATKER      : BNNP SULSEL`);
    doc.text(`TAHUN       : ${tahun}`);
    doc.moveDown(2);

    const cardY = doc.y;
    const cardW = 175, cardH = 70, gap = 12;
    const cards = [
      { label: 'Total Kerja Sama', val: data.length, color: '#1E3A5F' },
      { label: 'MOU', val: totalMou, color: '#4A7FB5' },
      { label: 'PKS', val: totalPks, color: '#4A7FB5' },
      { label: 'Dari Arsip', val: totalArsip, color: '#8C5F27' },
    ];
    cards.forEach((c, i) => {
      const x = 40 + i * (cardW + gap);
      doc.roundedRect(x, cardY, cardW, cardH, 6).fill(c.color);
      doc.fillColor('#fff').fontSize(22).text(String(c.val), x, cardY + 12, { width: cardW, align: 'center' });
      doc.fontSize(9).text(c.label.toUpperCase(), x, cardY + 44, { width: cardW, align: 'center' });
    });

    // ── Donut chart (Sistem vs Arsip) + Bar chart (Jenis Dokumen) — digambar
    // langsung pakai vector drawing bawaan pdfkit (bukan gambar/image), jadi
    // tidak butuh library canvas eksternal yang beresiko gagal di server. ──
    const chartY = cardY + cardH + 40;
    const totalSistem = data.filter(d => d.sumber === 'Sistem').length;
    const totalArsipChart = data.filter(d => d.sumber === 'Arsip').length;
    const totalSemua = Math.max(1, totalSistem + totalArsipChart);

    // Donut: Sistem vs Arsip
    const donutCx = 40 + 90, donutCy = chartY + 90, donutR = 75, donutRIn = 45;
    const sudutMulaiSistem = -Math.PI / 2;
    const sudutSistem = (totalSistem / totalSemua) * Math.PI * 2;

    const gambarSlice = (cx: number, cy: number, rOut: number, rIn: number, sudutAwal: number, sudutAkhir: number, warna: string) => {
      doc.save();
      doc.path(
        `M ${cx + rOut * Math.cos(sudutAwal)} ${cy + rOut * Math.sin(sudutAwal)} ` +
        `A ${rOut} ${rOut} 0 ${sudutAkhir - sudutAwal > Math.PI ? 1 : 0} 1 ${cx + rOut * Math.cos(sudutAkhir)} ${cy + rOut * Math.sin(sudutAkhir)} ` +
        `L ${cx + rIn * Math.cos(sudutAkhir)} ${cy + rIn * Math.sin(sudutAkhir)} ` +
        `A ${rIn} ${rIn} 0 ${sudutAkhir - sudutAwal > Math.PI ? 1 : 0} 0 ${cx + rIn * Math.cos(sudutAwal)} ${cy + rIn * Math.sin(sudutAwal)} Z`
      ).fill(warna);
      doc.restore();
    };

    if (totalSistem > 0) gambarSlice(donutCx, donutCy, donutR, donutRIn, sudutMulaiSistem, sudutMulaiSistem + sudutSistem, '#1E3A5F');
    if (totalArsipChart > 0) gambarSlice(donutCx, donutCy, donutR, donutRIn, sudutMulaiSistem + sudutSistem, sudutMulaiSistem + Math.PI * 2, '#8C5F27');

    doc.fillColor('#1E3A5F').fontSize(18).text(String(totalSemua), donutCx - donutRIn, donutCy - 10, { width: donutRIn * 2, align: 'center' });
    doc.fontSize(8).fillColor('#64748b').text('TOTAL', donutCx - donutRIn, donutCy + 10, { width: donutRIn * 2, align: 'center' });

    doc.fontSize(10).fillColor('#1E3A5F').text('Dokumen: Sistem vs Arsip', 40, chartY, { width: 200 });
    doc.rect(40, chartY + donutR * 2 + 20, 9, 9).fill('#1E3A5F');
    doc.fillColor('#334155').fontSize(9).text(`Sistem: ${totalSistem}`, 54, chartY + donutR * 2 + 19);
    doc.rect(40, chartY + donutR * 2 + 34, 9, 9).fill('#8C5F27');
    doc.fillColor('#334155').fontSize(9).text(`Arsip: ${totalArsipChart}`, 54, chartY + donutR * 2 + 33);

    // Bar chart: Jenis Dokumen (MOU, PKS, Sistem, Arsip)
    const barX0 = 260, barW = 46, barGap = 24, barMaxH = 130, barBaseY = chartY + barMaxH + 20;
    const barData = [
      { label: 'MOU', val: totalMou, color: '#1E3A5F' },
      { label: 'PKS', val: totalPks, color: '#4A7FB5' },
      { label: 'Sistem', val: totalSistem, color: '#5B8BB8' },
      { label: 'Arsip', val: totalArsipChart, color: '#A8C8EA' },
    ];
    const barMaxVal = Math.max(1, ...barData.map(b => b.val));
    doc.fontSize(10).fillColor('#1E3A5F').text('Jenis Dokumen', barX0, chartY, { width: 300 });
    barData.forEach((b, i) => {
      const x = barX0 + i * (barW + barGap);
      const h = (b.val / barMaxVal) * barMaxH;
      doc.rect(x, barBaseY - h, barW, h).fill(b.color);
      doc.fontSize(10).fillColor('#1E3A5F').text(String(b.val), x, barBaseY - h - 16, { width: barW, align: 'center' });
      doc.fontSize(8).fillColor('#64748b').text(b.label, x, barBaseY + 6, { width: barW, align: 'center' });
    });

    // Halaman 2 — tabel
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
    const headers = ['NO', 'Sumber', 'Tgl Berlaku', 'Jenis', 'Instansi', 'Judul', 'Nama PIC', 'No PIC', 'Email PIC', 'Pemb', 'Rehab', 'Penc', 'Pemby', 'Durasi', 'Berakhir', 'QR'];
    const widths = [20, 40, 50, 30, 80, 95, 60, 55, 80, 28, 28, 28, 32, 35, 50, 32];
    const startX = 30;
    let y = 30;
    const rowH = 26; // sedikit lebih tinggi biar muat gambar QR kecil

    const drawRow = (cells: string[], opts: { bold?: boolean; fillHeader?: boolean; shade?: boolean } = {}) => {
      let x = startX;
      doc.fontSize(6.5).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
      cells.forEach((c, i) => {
        if (opts.fillHeader) { doc.rect(x, y, widths[i], rowH).fill('#1E3A5F'); doc.fillColor('#fff'); }
        else if (opts.shade) { doc.rect(x, y, widths[i], rowH).fillAndStroke('#EAF2FC', '#cbd5e1'); doc.fillColor('#1E3A5F'); }
        else { doc.rect(x, y, widths[i], rowH).stroke(); doc.fillColor('#1E3A5F'); }
        doc.text(c, x + 2, y + 5, { width: widths[i] - 4, height: rowH - 4, ellipsis: true });
        x += widths[i];
      });
      y += rowH;
    };

    // Gambar QR code kecil di kolom terakhir (posisi X dihitung dari total lebar
    // kolom sebelumnya) — dipanggil TERPISAH dari drawRow karena butuh doc.image(),
    // bukan doc.text() biasa.
    const gambarQrDiBaris = (qrDataUrl: string | undefined, rowY: number) => {
      if (!qrDataUrl) return;
      const xQr = startX + widths.slice(0, widths.length - 1).reduce((a, b) => a + b, 0);
      try {
        const base64Data = qrDataUrl.split(',')[1] || '';
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, xQr + 3, rowY + 2, { width: rowH - 4, height: rowH - 4 });
      } catch { /* biarkan kosong kalau gambar gagal di-render */ }
    };

    drawRow(headers, { bold: true, fillHeader: true });
    if (data.length === 0) {
      doc.fillColor('#000').fontSize(9).font('Helvetica-Oblique').text('Data PKS/MOU saat itu tidak ditemukan', startX, y + 10);
    } else {
      data.forEach((d, idx) => {
        if (y > 480) { doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 }); y = 30; drawRow(headers, { bold: true, fillHeader: true }); }
        const rowYAwal = y;
        drawRow([
          String(d.no), d.sumber, d.tglBerlaku, d.jenis, d.instansi, d.judul, d.namaPIC, d.noPIC, d.emailPIC,
          d.bidang.pemberantasan ? 'V' : '', d.bidang.rehabilitasi ? 'V' : '',
          d.bidang.pencegahan ? 'V' : '', d.bidang.pemberdayaan ? 'V' : '',
          d.durasi, d.tglBerakhir, '',
        ], { shade: idx % 2 === 1 });
        gambarQrDiBaris(d.qrCode, rowYAwal);
      });
    }

    // Halaman 3 — tanda tangan
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
    doc.fillColor('#000').fontSize(11).font('Helvetica').text(`Makassar, ${tahun}`, { align: 'right' });
    doc.text('Kepala Badan Narkotika Nasional', { align: 'right' });
    doc.text('Provinsi Sulawesi Selatan', { align: 'right' });
    doc.moveDown(3);
    doc.text(pengaturan.namaKepala, { align: 'right', underline: true });
    doc.text(pengaturan.pangkat, { align: 'right' });

    doc.end();
  });
}

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const tahun = parseInt(searchParams.get('tahun') || '0');
    const format = (searchParams.get('format') || 'docx') as 'docx' | 'pdf';
    const mode = searchParams.get('mode') === 'inline' ? 'inline' : 'attachment';
    const sumberFilter = (searchParams.get('sumber') || 'semua') as 'semua' | 'sistem' | 'arsip';

    if (!tahun) {
      return NextResponse.json({ message: 'Parameter tahun wajib diisi.' }, { status: 400 });
    }

    const [data, pengaturan] = await Promise.all([ambilData(tahun, sumberFilter), ambilPengaturan()]);

    if (format === 'pdf') {
      const buffer = await buatPdf(tahun, data, pengaturan);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${mode}; filename="Laporan_Kerjasama_${tahun}.pdf"`,
        },
      });
    }

    const buffer = await buatDocx(tahun, data, pengaturan);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `${mode}; filename="Laporan_Kerjasama_${tahun}.docx"`,
      },
    });
  } catch (err) {
    console.error('[LAPORAN DOWNLOAD]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}