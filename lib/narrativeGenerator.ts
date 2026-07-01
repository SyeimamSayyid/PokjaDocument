// lib/narrativeGenerator.ts
// Generate narasi berita otomatis dari poin MOU/PKS — tanpa AI

// ── Kata kunci untuk deteksi topik dari poin ──────────────
const TOPIK_MAP: { kata: string[]; topik: string }[] = [
  { kata: ['sosialisasi', 'sosial', 'penyuluhan', 'edukasi', 'komunikasi', 'kie'], topik: 'sosialisasi' },
  { kata: ['pelatihan', 'latih', 'training', 'workshop', 'bimtek'], topik: 'pelatihan' },
  { kata: ['pengujian', 'tes urine', 'tes narkoba', 'deteksi', 'uji'], topik: 'pengujian' },
  { kata: ['penggiat', 'relawan', 'kader', 'satgas', 'p4gn'], topik: 'penggiat' },
  { kata: ['kampanye', 'promosi', 'advokasi', 'gerakan'], topik: 'kampanye' },
  { kata: ['kuliah', 'seminar', 'diskusi', 'forum', 'talkshow', 'sarasehan'], topik: 'seminar' },
  { kata: ['rehabilitasi', 'pemulihan', 'konseling', 'terapi'], topik: 'rehabilitasi' },
  { kata: ['penelitian', 'riset', 'kajian', 'studi', 'survei'], topik: 'penelitian' },
  { kata: ['intervensi', 'ibm', 'berbasis masyarakat'], topik: 'intervensi' },
  { kata: ['focus group', 'fgd', 'diskusi kelompok'], topik: 'diskusi' },
];

function deteksiTopik(poin: string[]): string[] {
  const topikDitemukan = new Set<string>();
  const teks = poin.join(' ').toLowerCase();
  TOPIK_MAP.forEach(({ kata, topik }) => {
    if (kata.some(k => teks.includes(k))) topikDitemukan.add(topik);
  });
  return Array.from(topikDitemukan);
}

function toTitleCase(str: string): string {
  const kecil = ['dan','atau','di','ke','dari','yang','dengan','untuk','dalam','oleh','pada'];
  return str.toLowerCase().split(' ').map((w, i) =>
    i === 0 || !kecil.includes(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w
  ).join(' ');
}

function formatTanggalNarasi(tgl: string): string {
  if (!tgl) return '';
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return tgl; }
}

// ── Rangkum poin jadi kalimat ──────────────────────────────
function rangkumPoin(poin: string[], max: number = 3): string {
  if (poin.length === 0) return '';
  const dipilih = poin.slice(0, max).map(p => {
    // Ambil kalimat pertama yang bermakna, potong kalau terlalu panjang
    const kalimat = p.split('.')[0].trim();
    return kalimat.length > 80 ? kalimat.substring(0, 77) + '...' : kalimat;
  });

  if (dipilih.length === 1) return dipilih[0];
  if (dipilih.length === 2) return `${dipilih[0]} dan ${dipilih[1]}`;
  return `${dipilih.slice(0, -1).join(', ')}, dan ${dipilih[dipilih.length - 1]}`;
}

// ── Generator utama ────────────────────────────────────────
export function generateNarasiOtomatis(params: {
  jenis:            string;
  namaMitra:        string;
  judul:            string;
  statusPublikasi:  string;
  tanggalKegiatan:  string;
  tempatKegiatan:   string;
  poinDipilih:      string[];
}): string {
  const {
    jenis, namaMitra, statusPublikasi,
    tanggalKegiatan, tempatKegiatan, poinDipilih,
  } = params;

  const tglStr    = formatTanggalNarasi(tanggalKegiatan);
  const tempatStr = tempatKegiatan || '';
  const topik     = deteksiTopik(poinDipilih);
  const rangkuman = rangkumPoin(poinDipilih, 3);

  // Susun keterangan waktu & tempat
  const keteranganWaktu =
    tglStr && tempatStr ? `pada ${tglStr} di ${tempatStr}` :
    tglStr              ? `pada ${tglStr}` :
    tempatStr           ? `di ${tempatStr}` : '';

  // Frase topik dari poin
  const topikFrase = topik.length > 0
    ? (() => {
        const map: Record<string, string> = {
          sosialisasi:  'sosialisasi dan edukasi pencegahan narkotika',
          pelatihan:    'pelatihan peningkatan kapasitas',
          pengujian:    'pengujian dan deteksi narkotika',
          penggiat:     'pembentukan dan pembinaan penggiat P4GN',
          kampanye:     'kampanye anti narkoba',
          seminar:      'seminar dan diskusi publik',
          rehabilitasi: 'program rehabilitasi dan pemulihan',
          penelitian:   'penelitian dan kajian P4GN',
          intervensi:   'intervensi berbasis masyarakat',
          diskusi:      'diskusi kelompok terarah',
        };
        const frasa = topik.slice(0, 3).map(t => map[t] || t);
        if (frasa.length === 1) return frasa[0];
        if (frasa.length === 2) return `${frasa[0]} dan ${frasa[1]}`;
        return `${frasa.slice(0,-1).join(', ')}, dan ${frasa[frasa.length-1]}`;
      })()
    : 'kegiatan pencegahan dan pemberantasan penyalahgunaan narkotika';

  // ── Template berdasarkan status ───────────────────────────
  if (statusPublikasi === 'akan-berlangsung') {
    return [
      `Badan Narkotika Nasional (BNN) Provinsi Sulawesi Selatan akan melaksanakan kegiatan kerja sama ${jenis} bersama ${namaMitra}${keteranganWaktu ? ' ' + keteranganWaktu : ''}.`,
      ``,
      `Program ini dirancang untuk mendorong ${topikFrase} sebagai bagian dari upaya Pencegahan dan Pemberantasan Penyalahgunaan dan Peredaran Gelap Narkotika (P4GN) di lingkungan ${namaMitra}.`,
      poinDipilih.length > 0
        ? `\nDalam kerja sama ini, rangkaian kegiatan yang akan dilaksanakan mencakup ${rangkuman}, yang diharapkan dapat memberikan dampak nyata bagi lingkungan ${namaMitra} dalam menciptakan generasi bebas narkoba.`
        : '',
    ].filter(Boolean).join('\n');
  }

  if (statusPublikasi === 'berlangsung') {
    return [
      `BNN Provinsi Sulawesi Selatan saat ini tengah melaksanakan serangkaian kegiatan kerja sama ${jenis} bersama ${namaMitra}${keteranganWaktu ? ' yang berlangsung ' + keteranganWaktu : ''}.`,
      ``,
      `Kegiatan ini merupakan implementasi nyata dari perjanjian kerja sama yang telah disepakati, dengan fokus pada ${topikFrase} di lingkungan ${namaMitra}.`,
      poinDipilih.length > 0
        ? `\nSaat ini sedang berjalan kegiatan berupa ${rangkuman}. Seluruh rangkaian kegiatan dilaksanakan secara terencana dan terstruktur demi memastikan efektivitas program P4GN yang berkelanjutan.`
        : '',
    ].filter(Boolean).join('\n');
  }

  if (statusPublikasi === 'telah-berlangsung') {
    return [
      `BNN Provinsi Sulawesi Selatan telah berhasil melaksanakan kegiatan kerja sama ${jenis} bersama ${namaMitra}${keteranganWaktu ? ' ' + keteranganWaktu : ''}.`,
      ``,
      `Kegiatan ini merupakan wujud nyata dari komitmen bersama dalam upaya ${topikFrase} di lingkungan ${namaMitra}. Seluruh rangkaian program berlangsung dengan lancar dan mendapat antusias yang baik dari seluruh peserta.`,
      poinDipilih.length > 0
        ? `\nKegiatan yang berhasil dilaksanakan mencakup ${rangkuman}. Capaian ini diharapkan dapat memberikan kontribusi positif bagi upaya P4GN secara berkelanjutan di Sulawesi Selatan.`
        : '',
    ].filter(Boolean).join('\n');
  }

  // Default
  return `BNN Provinsi Sulawesi Selatan melaksanakan kerja sama ${jenis} bersama ${namaMitra} dalam rangka ${topikFrase}.`;
}

// ── Preview narasi (untuk halaman extract-poin) ───────────
export function previewNarasi(params: Parameters<typeof generateNarasiOtomatis>[0]): string {
  return generateNarasiOtomatis(params);
}