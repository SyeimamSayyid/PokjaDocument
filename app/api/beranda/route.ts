import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

const DIVISI_LABEL: Record<string, string> = {
  'pencegahan':'Pencegahan', 'pemberantasan':'Pemberantasan',
  'rehabilitasi':'Rehabilitasi', 'pemberdayaan':'Pemberdayaan',
};

// Kolom Kegiatan Eplanning (0-based) — hanya yang dipakai di sini
const KEG = { TGL_DITETAPKAN:17, TGL_BERAKHIR_MOU:18 };

// Kolom Dokumen Kerja sama (0-based)
const DOK = { ID:0, FOTO_FOLDER:18, TGL_KEG_MULAI:20, TGL_KEG_SELESAI:21, DIVISI:23 };

function parseDivisi(raw: string): string[] {
  return String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
}

// Hitung bucket publikasi dari tanggal kegiatan
function hitungBucket(tglMulai: string, tglSelesai: string, fallback: string): string {
  if (!tglMulai && !tglSelesai) return fallback || 'akan-berlangsung';
  const now = new Date(); now.setHours(0,0,0,0);
  const mulai   = tglMulai   ? new Date(tglMulai)   : null;
  const selesai = tglSelesai ? new Date(tglSelesai) : null;
  if (mulai)   mulai.setHours(0,0,0,0);
  if (selesai) selesai.setHours(23,59,59,999);
  if (selesai && now > selesai) return 'telah-berlangsung';
  if (mulai && now >= mulai)    return 'berlangsung';
  return 'akan-berlangsung';
}

function generateNarasi(p: { jenis:string; namaMitra:string; statusPublikasi:string; tanggalKegiatan:string; tempatKegiatan:string }): string {
  const { jenis, namaMitra, statusPublikasi, tanggalKegiatan, tempatKegiatan } = p;
  const tglStr = tanggalKegiatan ? new Date(tanggalKegiatan).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '';
  const tt = [tglStr, tempatKegiatan ? `di ${tempatKegiatan}` : ''].filter(Boolean).join(' ');
  const map: Record<string,string> = {
    'akan-berlangsung': `BNN Provinsi Sulawesi Selatan akan melaksanakan kegiatan kerja sama ${jenis} bersama ${namaMitra}${tt ? ` pada ${tt}` : ''}.`,
    'berlangsung':      `BNN Provinsi Sulawesi Selatan sedang melaksanakan kegiatan kerja sama ${jenis} bersama ${namaMitra}${tt ? ` ${tt}` : ''}.`,
    'telah-berlangsung':`BNN Provinsi Sulawesi Selatan telah melaksanakan kegiatan kerja sama ${jenis} bersama ${namaMitra}${tt ? ` pada ${tt}` : ''}.`,
  };
  return map[statusPublikasi] || map['berlangsung'];
}

async function getFoto(fotoFolderId: string): Promise<{ fileId:string; thumbnailUrl:string; nama:string; ukuran:number }[]> {
  if (!fotoFolderId) return [];
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ action:'listFoto', fotoFolderId }), redirect:'follow',
    });
    const d = await res.json();
    if (d.success && d.files?.length > 0) {
      return d.files.map((f: { fileId:string; nama:string; ukuran:number }) => ({
        fileId:f.fileId,
        thumbnailUrl:`/api/foto/${f.fileId}`,
        nama:f.nama, ukuran:f.ukuran,
      }));
    }
  } catch {}
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // AKAN DATANG (Rencana PKS): dari Kegiatan Eplanning yang publik
    let akanDatang: Record<string, unknown>[] = [];
    try {
      const kegRows = await getSheetData('Kegiatan Eplanning');
      akanDatang = kegRows
        .filter(r => r[0]
          && String(r[1]) === 'kerja-sama-kelembagaan'
          && String(r[13]) === 'Ya'
          && !['Ditutup','Selesai'].includes(String(r[12])))
        .map(r => {
          const target = parseInt(String(r[6]||'0'))||0;
          const terisi = parseInt(String(r[7]||'0'))||0;
          const divisiArr = parseDivisi(String(r[2]||''));
          return {
            id:String(r[0]),
            divisi:divisiArr,
            divisiLabel:divisiArr.map(d => DIVISI_LABEL[d] || d),
            judul:String(r[3]), deskripsi:String(r[4]), jenis:String(r[5]),
            target, terisi, sisaKuota:target-terisi,
            wilayah:String(r[8]||''), biaya:String(r[9]||''),
            tglMulai:String(r[10]||''), tglTarget:String(r[11]||''),
            tglDitetapkan:String(r[KEG.TGL_DITETAPKAN]||''),
            tglBerakhirMou:String(r[KEG.TGL_BERAKHIR_MOU]||''),
            status:String(r[12]), kuotaPenuh:terisi>=target,
          };
        });
    } catch {}

    // 3 tab dari Poin Publik Kegiatan
    const pubRows = await getSheetData('Poin Publik Kegiatan');
    const dokRows = await getSheetData('Dokumen Kerja sama');

    const dokMap: Record<string, { fotoFolderId:string; tglKegMulai:string; tglKegSelesai:string; divisi:string }> = {};
    dokRows.forEach(r => {
      if (r[DOK.ID]) dokMap[String(r[DOK.ID])] = {
        fotoFolderId:String(r[DOK.FOTO_FOLDER]||''),
        tglKegMulai:String(r[DOK.TGL_KEG_MULAI]||''),
        tglKegSelesai:String(r[DOK.TGL_KEG_SELESAI]||''),
        divisi:String(r[DOK.DIVISI]||''),
      };
    });

    const semua = pubRows
      .filter(r => r[0] && r[5])
      .map(r => {
        const idDokumen = String(r[1]);
        const dok = dokMap[idDokumen] || { fotoFolderId:'', tglKegMulai:'', tglKegSelesai:'', divisi:'' };
        let poinDipilih: string[] = [];
        const raw = String(r[8]||'');
        if (raw.startsWith('[')) { try { poinDipilih = JSON.parse(raw); } catch {} }
        else if (raw) poinDipilih = raw.split('||').filter(Boolean);

        const jenis = String(r[2]); const judul = String(r[3]); const namaMitra = String(r[4]);
        const tempatKegiatan = String(r[7]||'');
        const tglMulai   = dok.tglKegMulai   || String(r[6]||'');
        const tglSelesai = dok.tglKegSelesai || '';
        const divisi = String(r[11]||'') || dok.divisi || '';
        const statusPublikasi = hitungBucket(tglMulai, tglSelesai, String(r[5]));

        return {
          id:String(r[0]), idDokumen, jenis, judul, namaMitra, statusPublikasi,
          tanggalKegiatan:tglMulai, tglKegiatanSelesai:tglSelesai, tempatKegiatan, poinDipilih,
          divisi, divisiLabel:DIVISI_LABEL[divisi]||divisi,
          narasi:generateNarasi({ jenis, namaMitra, statusPublikasi, tanggalKegiatan:tglMulai, tempatKegiatan }),
          tglDibuat:String(r[9]||''), dibuatOleh:String(r[10]||''),
          fotoFolderId:dok.fotoFolderId,
        };
      })
      .filter(d => d.poinDipilih.length > 0);

    if (id) {
      const item = semua.find(d => d.id === id || d.idDokumen === id);
      if (!item) return NextResponse.json({ message:'Tidak ditemukan.' }, { status:404 });
      const foto = await getFoto(item.fotoFolderId);
      return NextResponse.json({ item: { ...item, foto } });
    }

    const hasilFoto: Record<string, { fileId:string; thumbnailUrl:string; nama:string }[]> = {};
    await Promise.all(
      semua.filter(d => ['berlangsung','telah-berlangsung'].includes(d.statusPublikasi) && d.fotoFolderId)
        .map(async d => { const f = await getFoto(d.fotoFolderId); if (f.length) hasilFoto[d.id] = f.slice(0,3); })
    );
    const withFoto = semua.map(d => ({ ...d, foto: hasilFoto[d.id]||[] }));

    return NextResponse.json({
      akanDatang,
      akanBerlangsung:  withFoto.filter(d => d.statusPublikasi === 'akan-berlangsung'),
      berlangsung:      withFoto.filter(d => d.statusPublikasi === 'berlangsung'),
      telahBerlangsung: withFoto.filter(d => d.statusPublikasi === 'telah-berlangsung'),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}