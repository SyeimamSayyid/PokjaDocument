'use client';

import { useEffect } from 'react';

// Halaman "Tata Kelola Kerja Sama" sudah digabung ke /dashboard/dokumen
// (folder per Jenis → Institusi, filter tahap status, ringkasan poin).
// Redirect otomatis supaya link/bookmark lama tetap berfungsi.
export default function TataKelolaRedirect() {
  useEffect(() => {
    window.location.replace('/dashboard/dokumen');
  }, []);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', color:'#64748b', fontSize:13 }}>
      Mengalihkan ke Daftar Dokumen...
    </div>
  );
}