import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, VerticalAlign, ShadingType,
  SectionType, PageOrientation,
} from 'docx';
import PDFDocument from 'pdfkit';

const DOK_COL = {
  ID: 0, JENIS: 1, JUDUL: 2, ID_MITRA: 3, NAMA_MITRA: 4,
  TGL_BERLAKU: 6, TGL_BERAKHIR: 7, DURASI: 8,
  DIVISI: 23,
};
const PJ_COL = { ID_MITRA: 1, NAMA: 2, EMAIL: 7, WA: 8, PIC: 18 };

// Dimensi A4 dalam DXA (satuan Word). Portrait: 11906 x 16838.
// docx-js akan menukar width/height sendiri saat orientation LANDSCAPE diset.
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;

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

async function ambilData(tahun: number) {
  const dokRows = await getSheetData('Dokumen Kerja sama');
  let pjRows: string[][] = [];
  try { pjRows = await getSheetData('Pengajuan Mitra'); } catch { pjRows = []; }

  const filtered = dokRows.filter(r => {
    if (!r[DOK_COL.ID]) return false;
    const tgl = new Date(String(r[DOK_COL.TGL_BERLAKU]));
    return !isNaN(tgl.getTime()) && tgl.getFullYear() === tahun;
  });

  return filtered.map((r, i) => {
    const idMitra = String(r[DOK_COL.ID_MITRA] || '').trim();
    const namaInstitusi = String(r[DOK_COL.NAMA_MITRA] || '').trim();
    const kontak = resolveKontak(idMitra, namaInstitusi, pjRows);
    const divisiRaw = String(r[DOK_COL.DIVISI] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return {
      no: i + 1,
      tglBerlaku: String(r[DOK_COL.TGL_BERLAKU] || ''),
      jenis: String(r[DOK_COL.JENIS] || ''),
      instansi: namaInstitusi,
      judul: String(r[DOK_COL.JUDUL] || ''),
      namaPIC: kontak.namaPIC,
      noPIC: kontak.wa,
      emailPIC: kontak.email,
      bidang: {
        pemberantasan: divisiRaw.includes('pemberantasan'),
        rehabilitasi: divisiRaw.includes('rehabilitasi'),
        pencegahan: divisiRaw.includes('pencegahan'),
        pemberdayaan: divisiRaw.includes('pemberdayaan'),
      },
      durasi: String(r[DOK_COL.DURASI] || ''),
      tglBerakhir: String(r[DOK_COL.TGL_BERAKHIR] || ''),
    };
  });
}

async function ambilPengaturan() {
  const rows = await getSheetData('Pengaturan Laporan');
  const row = rows[0] || [];
  return {
    namaKepala: String(row[0] || '(Nama Kepala belum diisi)'),
    pangkat: String(row[1] || '(Pangkat belum diisi)'),
  };
}

function cellText(text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.CENTER,
      children: [new TextRun({ text, bold: opts.bold, size: opts.size || 16 })],
    })],
  });
}

function headerCell(text: string) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' },
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 16 })],
    })],
  });
}

async function buatDocx(tahun: number, data: Awaited<ReturnType<typeof ambilData>>, pengaturan: { namaKepala: string; pangkat: string }) {
  const headerRow1 = new TableRow({
    children: [
      headerCell('NO'), headerCell('Tanggal Berlaku'), headerCell('Jenis Dokumen'),
      headerCell('Instansi'), headerCell('Judul Dokumen'), headerCell('Nama PIC'),
      headerCell('No PIC'), headerCell('Email PIC'),
      new TableCell({
        columnSpan: 4,
        shading: { type: ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Bidang Terlibat', bold: true, size: 16 })] })],
      }),
      headerCell('Durasi Berlaku'), headerCell('Masa Berakhir Kerja Sama'),
    ],
  });

  const headerRow2 = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph('')] }),
      new TableCell({ children: [new Paragraph('')] }),
      new TableCell({ children: [new Paragraph('')] }),
      new TableCell({ children: [new Paragraph('')] }),
      new TableCell({ children: [new Paragraph('')] }),
      new TableCell({ children: [new Paragraph('')] }),
      new TableCell({ children: [new Paragraph('')] }),
      new TableCell({ children: [new Paragraph('')] }),
      headerCell('Pemberantasan'), headerCell('Rehabilitasi'), headerCell('Pencegahan'), headerCell('Pemberdayaan Masyarakat'),
      new TableCell({ children: [new Paragraph('')] }),
      new TableCell({ children: [new Paragraph('')] }),
    ],
  });

  const dataRows = data.length === 0
    ? [new TableRow({
        children: [new TableCell({
          columnSpan: 13,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Data PKS/MOU saat itu tidak ditemukan', italics: true })] })],
        })],
      })]
    : data.map(d => new TableRow({
        children: [
          cellText(String(d.no)),
          cellText(d.tglBerlaku),
          cellText(d.jenis),
          cellText(d.instansi, { align: AlignmentType.LEFT }),
          cellText(d.judul, { align: AlignmentType.LEFT }),
          cellText(d.namaPIC, { align: AlignmentType.LEFT }),
          cellText(d.noPIC),
          cellText(d.emailPIC, { align: AlignmentType.LEFT }),
          cellText(d.bidang.pemberantasan ? '✓' : ''),
          cellText(d.bidang.rehabilitasi ? '✓' : ''),
          cellText(d.bidang.pencegahan ? '✓' : ''),
          cellText(d.bidang.pemberdayaan ? '✓' : ''),
          cellText(d.durasi ? `${d.durasi} Tahun` : ''),
          cellText(d.tglBerakhir),
        ],
      }));

  const tabel = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow1, headerRow2, ...dataRows],
  });

  // Semua section pakai orientation LANDSCAPE — dimensi diberikan dalam
  // ukuran portrait A4, docx-js menukar width/height sendiri sesuai catatan skill.
  const landscapePage = { size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: PageOrientation.LANDSCAPE } };

  const doc = new Document({
    sections: [
      {
        properties: { page: landscapePage },
        children: [
          new Paragraph({ children: [new TextRun('BADAN NARKOTIKA NASIONAL')] }),
          new Paragraph({ children: [new TextRun({ text: 'PROVINSI SULAWESI SELATAN', underline: {} })] }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'DATA ARSIP HASIL KERJA SAMA BNNP SULSEL', bold: true, size: 26 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(tahun), bold: true, size: 26 })],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun('SATKER\t\t: BNNP SULSEL')] }),
          new Paragraph({ children: [new TextRun(`TAHUN\t\t: ${tahun}`)] }),
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

function buatPdf(tahun: number, data: Awaited<ReturnType<typeof ambilData>>, pengaturan: { namaKepala: string; pangkat: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Seluruh dokumen landscape — halaman pertama dan setiap addPage berikutnya
    // eksplisit diberi layout: 'landscape' (pdfkit tidak otomatis mewarisi ini antar halaman).
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Halaman 1 — cover
    doc.fontSize(11).text('BADAN NARKOTIKA NASIONAL');
    doc.text('PROVINSI SULAWESI SELATAN', { underline: true });
    doc.moveDown(2);
    doc.fontSize(14).text('DATA ARSIP HASIL KERJA SAMA BNNP SULSEL', { align: 'center' });
    doc.fontSize(14).text(String(tahun), { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(11).text(`SATKER      : BNNP SULSEL`);
    doc.text(`TAHUN       : ${tahun}`);

    // Halaman 2 — tabel
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
    const headers = ['NO', 'Tgl Berlaku', 'Jenis', 'Instansi', 'Judul', 'Nama PIC', 'No PIC', 'Email PIC', 'Pemb', 'Rehab', 'Penc', 'Pemby', 'Durasi', 'Berakhir'];
    const widths = [22, 55, 35, 90, 110, 70, 60, 90, 30, 30, 30, 35, 40, 55];
    const startX = 30;
    let y = 30;
    const rowH = 22;

    const drawRow = (cells: string[], bold = false) => {
      let x = startX;
      doc.fontSize(7).font(bold ? 'Helvetica-Bold' : 'Helvetica');
      cells.forEach((c, i) => {
        doc.rect(x, y, widths[i], rowH).stroke();
        doc.text(c, x + 2, y + 6, { width: widths[i] - 4, height: rowH - 4, ellipsis: true });
        x += widths[i];
      });
      y += rowH;
    };

    drawRow(headers, true);
    if (data.length === 0) {
      doc.fontSize(9).font('Helvetica-Oblique').text('Data PKS/MOU saat itu tidak ditemukan', startX, y + 10);
    } else {
      data.forEach(d => {
        if (y > 480) { doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 }); y = 30; }
        drawRow([
          String(d.no), d.tglBerlaku, d.jenis, d.instansi, d.judul, d.namaPIC, d.noPIC, d.emailPIC,
          d.bidang.pemberantasan ? 'V' : '', d.bidang.rehabilitasi ? 'V' : '',
          d.bidang.pencegahan ? 'V' : '', d.bidang.pemberdayaan ? 'V' : '',
          d.durasi, d.tglBerakhir,
        ]);
      });
    }

    // Halaman 3 — tanda tangan
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
    doc.fontSize(11).font('Helvetica').text(`Makassar, ${tahun}`, { align: 'right' });
    doc.text('Kepala Badan Narkotika Nasional', { align: 'right' });
    doc.text('Provinsi Sulawesi Selatan', { align: 'right' });
    doc.moveDown(3);
    doc.text(pengaturan.namaKepala, { align: 'right', underline: true });
    doc.text(pengaturan.pangkat, { align: 'right' });

    doc.end();
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tahun = parseInt(searchParams.get('tahun') || '0');
    const format = (searchParams.get('format') || 'docx') as 'docx' | 'pdf';
    const mode = searchParams.get('mode') === 'inline' ? 'inline' : 'attachment';

    if (!tahun) {
      return NextResponse.json({ message: 'Parameter tahun wajib diisi.' }, { status: 400 });
    }

    const [data, pengaturan] = await Promise.all([ambilData(tahun), ambilPengaturan()]);

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