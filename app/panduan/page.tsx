// app/panduan/page.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PanduanPage() {
  const [activeTab, setActiveTab] = useState('akses');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tabs = [
    { id: 'akses', label: 'Cara Akses Sistem' },
    { id: 'buat', label: 'Membuat Dokumen' },
    { id: 'kode', label: 'Kode Akses' },
    { id: 'upload', label: 'Upload Berkas' },
    { id: 'status', label: 'Status Dokumen' },
    { id: 'faq', label: 'FAQ' }
  ];

  const faqs = [
    { q: 'Apakah mitra perlu membuat akun untuk mengakses dokumen?', a: 'Tidak perlu. Pihak mitra cukup menggunakan kode akses yang dikirim ke email mereka untuk membuka dokumen — tanpa perlu registrasi atau membuat akun apapun.' },
    { q: 'Apa yang terjadi jika kode akses kedaluwarsa?', a: 'Kode yang sudah lewat 72 jam tidak bisa digunakan lagi. Hubungi pihak yang membuat dokumen untuk meminta kode baru dikirimkan ulang ke email Anda. Kode lama otomatis tidak aktif.' },
    { q: 'Apakah dokumen aman dari kebocoran?', a: 'Ya. Dokumen hanya bisa diakses melalui kode unik yang dikirim ke email terdaftar. Kode bersifat satu kali pakai per sesi dan kedaluwarsa otomatis — sehingga link tidak bisa disebarkan sembarangan.' },
    { q: 'Di mana dokumen dan berkas tersimpan?', a: 'Semua dokumen tersimpan di Google Drive dalam folder yang dibuat otomatis oleh sistem — terstruktur per institusi dan per tahun. Data perjanjian tercatat di Google Sheets sebagai database.' },
    { q: 'Bisakah mitra mengedit isi dokumen?', a: 'Tidak. Pihak mitra hanya memiliki akses baca (view only) terhadap dokumen. Perubahan isi dokumen hanya bisa dilakukan oleh pengguna yang terdaftar dan berwenang di sistem.' },
    { q: 'Berapa batas ukuran berkas yang bisa diunggah?', a: 'Maksimum 10 MB per berkas. Format yang diterima meliputi PDF, JPG, PNG, dan DOCX.' },
    { q: 'Bagaimana jika email kode akses tidak masuk?', a: 'Pertama, periksa folder spam atau promosi di email Anda. Jika masih tidak ditemukan setelah 5 menit, minta pengirim dokumen untuk mengirim ulang kode melalui sistem.' }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText('MOU-X7K2P9');
    alert('Kode berhasil disalin!');
  };

  return (
    <div className="page-container">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo">
            <i className="ri-file-copy-line"></i>
          </div>
          <span className="nav-name">SI-POKJA HUMKER</span>
        </div>
        <div className="nav-links">
          <Link href="/" className="nav-link">Beranda</Link>
          <Link href="/panduan" className="nav-link">Panduan</Link>
          <button className="nav-cta">Masuk</button>
        </div>
      </nav>

      <div className="page">
        {/* Guide Hero */}
        <div className="guide-hero">
          <div className="hero-chip">
            <i className="ri-book-open-line"></i> Panduan Lengkap
          </div>
          <h2>Cara menggunakan SI-POKJA HUMKER</h2>
          <p>Panduan langkah demi langkah untuk membuat, mengakses, dan mengelola dokumen perjanjian di sistem ini.</p>
        </div>

        {/* Guide Tabs */}
        <div className="guide-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`guide-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Akses Sistem */}
        {activeTab === 'akses' && (
          <div className="step-list">
            <div className="step-item">
              <div className="step-num">1</div>
              <div>
                <div className="step-title">Buka halaman SI-POKJA HUMKER</div>
                <div className="step-desc">Kunjungi alamat website melalui browser. Pastikan menggunakan koneksi internet yang stabil agar proses login berjalan lancar.</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">2</div>
              <div>
                <div className="step-title">Pilih jalur masuk yang sesuai</div>
                <div className="step-desc">Di halaman awal tersedia dua pilihan: <strong>Masuk dengan akun</strong> — untuk pengguna yang terdaftar di sistem, atau <strong>Akses dokumen</strong> — untuk pihak mitra yang menerima kode akses via email.</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">3</div>
              <div>
                <div className="step-title">Login menggunakan akun Google</div>
                <div className="step-desc">Pengguna terdaftar masuk menggunakan akun Google yang sudah didaftarkan ke sistem. Klik tombol "Masuk dengan Google" dan pilih akun yang sesuai.</div>
                <div className="step-note"><i className="ri-alert-line"></i> Gunakan akun Google resmi institusi, bukan akun pribadi</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">4</div>
              <div>
                <div className="step-title">Atau — masukkan kode akses dokumen</div>
                <div className="step-desc">Jika Anda pihak mitra yang menerima kode via email, pilih "Akses dokumen" lalu masukkan kode yang tertera di email. Tidak perlu membuat akun.</div>
                <div className="step-tip"><i className="ri-information-line"></i> Kode berlaku 72 jam sejak dikirim</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">5</div>
              <div>
                <div className="step-title">Anda akan diarahkan ke tampilan yang sesuai</div>
                <div className="step-desc">Setelah masuk, sistem secara otomatis menampilkan halaman yang relevan — dashboard pengelolaan untuk pengguna terdaftar, atau langsung ke dokumen untuk pihak mitra.</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Membuat Dokumen */}
        {activeTab === 'buat' && (
          <div className="step-list">
            <div className="step-item">
              <div className="step-num">1</div>
              <div>
                <div className="step-title">Klik "Buat Dokumen Baru" di dashboard</div>
                <div className="step-desc">Tombol tersedia di bagian atas dashboard. Pilih jenis dokumen — MOU (Memorandum of Understanding) atau MOA (Memorandum of Agreement) — sesuai kebutuhan perjanjian.</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">2</div>
              <div>
                <div className="step-title">Isi data pihak pertama dan pihak kedua</div>
                <div className="step-desc">Masukkan nama institusi, nama perwakilan, jabatan, dan alamat email masing-masing pihak. Data ini akan otomatis mengisi template dokumen.</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">3</div>
              <div>
                <div className="step-title">Tentukan ruang lingkup dan periode perjanjian</div>
                <div className="step-desc">Isi deskripsi singkat perihal perjanjian, tanggal mulai berlaku, dan tanggal berakhirnya. Informasi ini akan menjadi bagian isi dokumen secara otomatis.</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">4</div>
              <div>
                <div className="step-title">Klik "Generate Dokumen"</div>
                <div className="step-desc">Sistem akan membuat dokumen Google Docs dari template, menyimpannya di folder Drive yang sesuai, dan mencatat data ke Spreadsheet — semuanya otomatis dalam hitungan detik.</div>
                <div className="step-tip"><i className="ri-flashlight-line"></i> Dokumen langsung tersimpan, tidak perlu simpan manual</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">5</div>
              <div>
                <div className="step-title">Tinjau dan kirim kode akses ke mitra</div>
                <div className="step-desc">Setelah dokumen terbuat, Anda bisa langsung melihat pratinjau. Klik "Kirim Kode" untuk mengirimkan kode akses unik ke email kedua pihak secara otomatis.</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Kode Akses */}
        {activeTab === 'kode' && (
          <>
            <div className="code-demo">
              <div className="code-label">Contoh kode akses</div>
              <div className="code-display">
                <div className="code-box">MOU-X7K2P9</div>
                <button className="copy-btn" onClick={handleCopyCode}>
                  <i className="ri-file-copy-line"></i> Salin
                </button>
              </div>
              <div className="expire-note" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ri-time-line"></i> Berlaku hingga 72 jam sejak dikirim
              </div>
            </div>
            <div className="step-list">
              <div className="step-item">
                <div className="step-num">1</div>
                <div><div className="step-title">Cek email yang terdaftar</div><div className="step-desc">Kode akses dikirim otomatis ke email yang diinputkan saat dokumen dibuat. Periksa folder masuk — atau folder spam jika tidak ditemukan.</div></div>
              </div>
              <div className="step-item">
                <div className="step-num">2</div>
                <div><div className="step-title">Buka SI-POKJA HUMKER dan pilih "Akses Dokumen"</div><div className="step-desc">Di halaman awal, pilih opsi akses dokumen. Tidak perlu membuat akun — cukup gunakan kode yang diterima.</div></div>
              </div>
              <div className="step-item">
                <div className="step-num">3</div>
                <div><div className="step-title">Masukkan kode akses</div><div className="step-desc">Ketik atau tempel kode dari email ke kolom yang tersedia. Kode bersifat case-sensitive — perhatikan huruf besar dan kecilnya.</div>
                <div className="step-note"><i className="ri-shield-warning-line"></i> Jangan bagikan kode ini ke pihak lain</div></div>
              </div>
              <div className="step-item">
                <div className="step-num">4</div>
                <div><div className="step-title">Dokumen terbuka secara otomatis</div><div className="step-desc">Jika kode valid dan belum kedaluwarsa, Anda akan langsung diarahkan ke dokumen yang bersangkutan di Google Docs. Akses ini tercatat di log sistem.</div></div>
              </div>
            </div>
          </>
        )}

        {/* Tab Content: Upload Berkas */}
        {activeTab === 'upload' && (
          <>
            <div className="upload-area">
              <i className="ri-cloud-upload-line"></i>
              <p>Seret dan lepas berkas di sini, atau klik untuk memilih</p>
              <div className="upload-types">
                <span className="upload-type">PDF</span>
                <span className="upload-type">JPG</span>
                <span className="upload-type">PNG</span>
                <span className="upload-type">DOCX</span>
              </div>
            </div>
            <div className="step-list">
              <div className="step-item">
                <div className="step-num">1</div>
                <div><div className="step-title">Akses dokumen menggunakan kode</div><div className="step-desc">Masuk ke dokumen terlebih dahulu menggunakan kode akses yang diterima via email. Fitur upload tersedia setelah Anda berhasil mengakses dokumen.</div></div>
              </div>
              <div className="step-item">
                <div className="step-num">2</div>
                <div><div className="step-title">Buka tab "Berkas Pendukung"</div><div className="step-desc">Di halaman dokumen, tersedia tab khusus untuk upload berkas. Klik tab tersebut untuk melihat daftar berkas yang perlu diunggah.</div></div>
              </div>
              <div className="step-item">
                <div className="step-num">3</div>
                <div><div className="step-title">Upload berkas yang diminta</div><div className="step-desc">Berkas yang umumnya dibutuhkan antara lain: logo institusi (PNG/JPG), surat kuasa atau SK penunjukan (PDF), dan dokumen identitas perwakilan (PDF/JPG).</div>
                <div className="step-note"><i className="ri-alert-line"></i> Ukuran maksimum per berkas adalah 10 MB</div></div>
              </div>
              <div className="step-item">
                <div className="step-num">4</div>
                <div><div className="step-title">Berkas tersimpan otomatis ke Drive</div><div className="step-desc">Setiap berkas yang diunggah akan langsung masuk ke folder Google Drive yang dibuat khusus untuk institusi Anda — terorganisir dan mudah ditemukan kembali.</div>
                <div className="step-tip"><i className="ri-checkbox-circle-line"></i> Konfirmasi unggah berhasil akan muncul di layar</div></div>
              </div>
            </div>
          </>
        )}

        {/* Tab Content: Status Dokumen */}
        {activeTab === 'status' && (
          <>
            <div className="status-list">
              <div className="status-item"><div className="status-dot sd-draft"></div><div><div className="status-name">Draft</div><div className="status-desc">Dokumen baru dibuat, belum dikirim ke mitra</div></div></div>
              <div className="status-item"><div className="status-dot sd-review"></div><div><div className="status-name">Dalam tinjauan</div><div className="status-desc">Kode sudah dikirim, mitra belum membuka</div></div></div>
              <div className="status-item"><div className="status-dot sd-wait"></div><div><div className="status-name">Menunggu tanda tangan</div><div className="status-desc">Dokumen sudah dibuka, belum ditandatangani</div></div></div>
              <div className="status-item"><div className="status-dot sd-done"></div><div><div className="status-name">Selesai</div><div className="status-desc">Perjanjian sudah ditandatangani kedua pihak</div></div></div>
              <div className="status-item"><div className="status-dot sd-exp"></div><div><div className="status-name">Kedaluwarsa</div><div className="status-desc">Kode akses sudah habis masa berlakunya</div></div></div>
            </div>
            <div className="step-list">
              <div className="step-item"><div className="step-num">1</div><div><div className="step-title">Lihat semua dokumen di halaman daftar</div><div className="step-desc">Dashboard menampilkan seluruh dokumen beserta statusnya dalam satu tampilan. Gunakan filter untuk menyaring berdasarkan status, tanggal, atau nama mitra.</div></div></div>
              <div className="step-item"><div className="step-num">2</div><div><div className="step-title">Klik dokumen untuk melihat detail</div><div className="step-desc">Halaman detail menampilkan riwayat akses — siapa yang membuka, kapan, serta berkas apa saja yang sudah diunggah oleh pihak mitra.</div></div></div>
              <div className="step-item"><div className="step-num">3</div><div><div className="step-title">Kirim pengingat jika perlu</div><div className="step-desc">Jika dokumen masih dalam status "Menunggu tanda tangan" lebih dari beberapa hari, tersedia tombol untuk mengirim ulang notifikasi ke email mitra.</div></div></div>
            </div>
          </>
        )}

        {/* Tab Content: FAQ */}
        {activeTab === 'faq' && (
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <div className={`faq-q ${openFaq === index ? 'open' : ''}`} onClick={() => toggleFaq(index)}>
                  {faq.q}
                  <i className={`ri-arrow-down-s-line ${openFaq === index ? 'open' : ''}`}></i>
                </div>
                <div className={`faq-a ${openFaq === index ? 'open' : ''}`}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <div className="footer-brand">SI-POKJA HUMKER</div>
          <div className="footer-copy">Panduan Pengguna v1.0</div>
        </div>
      </div>
    </div>
  );
}