'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, ChevronRight, RotateCcw, CheckCircle2 } from 'lucide-react';

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';

interface FaqItem {
  id: string; pertanyaan: string; jawaban: string; idLanjutan: string[];
  tampilAwal: boolean; aktif: boolean; urutan: number;
}

interface PesanChat {
  dari: 'bot' | 'user';
  teks: string;
  pilihan?: { label: string; jawabanId: string }[];
  tawarkanKirim?: string; // kalau ada, tampilkan tombol "Kirim ke Admin" dengan teks ini
}

const SAPAAN_TEMPLATE = 'Halo! Saya asisten E-POKJA HUKER. Saya bisa bantu jelaskan fungsi/kegunaan bagian-bagian sistem ini. Pilih pertanyaan di bawah, atau ketik kata kunci:';

// Cocokkan input bebas ke FAQ berdasarkan kemunculan kata kunci sederhana —
// bukan NLP/AI, cukup untuk lingkup "apa fungsi X" yang terbatas.
function cariJawaban(input: string, faqList: FaqItem[]): FaqItem | null {
  const q = input.toLowerCase();
  let terbaik: FaqItem | null = null;
  let skorTerbaik = 0;
  for (const f of faqList) {
    const kataKunci = (f.pertanyaan + ' ' + f.jawaban).toLowerCase().split(/\s+/).filter(w => w.length > 3);
    let skor = 0;
    kataKunci.forEach(k => { if (q.includes(k)) skor++; });
    if (skor > skorTerbaik) { skorTerbaik = skor; terbaik = f; }
  }
  return skorTerbaik > 0 ? terbaik : null;
}

interface ChatbotWidgetProps {
  /** Label ramah buat admin tau chat ini dari halaman mana, mis. "Halaman Kegiatan" */
  sumberLabel?: string;
  /** Variasi warna tema — beda per halaman biar chatbot terasa "menyatu" dengan konteksnya */
  tema?: 'biru' | 'emas' | 'hijau';
  /** Teks sapaan custom, kalau beda dari default */
  sapaan?: string;
}

const TEMA_WARNA: Record<string, { utama: string; terang: string; gelap: string }> = {
  biru: { utama: BLUE, terang: BLUE_LIGHT, gelap: BLUE_DARK },
  emas: { utama: '#B5813F', terang: '#D9A44F', gelap: '#8C5F27' },
  hijau: { utama: '#0a5c47', terang: '#0f7a5e', gelap: '#053d2f' },
};

export default function ChatbotWidget({ sumberLabel, tema = 'biru', sapaan }: ChatbotWidgetProps) {
  const warna = TEMA_WARNA[tema];
  const sapaanTemplate = sapaan || SAPAAN_TEMPLATE;
  const [terbuka, setTerbuka] = useState(false);
  const [faqList, setFaqList] = useState<FaqItem[]>([]);
  const [faqLoaded, setFaqLoaded] = useState(false);
  const [pesan, setPesan] = useState<PesanChat[]>([]);
  const [input, setInput] = useState('');
  const [mengetik, setMengetik] = useState(false);
  const [terkirimId, setTerkirimId] = useState<number | null>(null);
  const bawahRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/chatbot/faq')
      .then(r => r.json())
      .then(d => {
        const list: FaqItem[] = d.data || [];
        setFaqList(list);
        const utama = list.filter(f => f.tampilAwal).slice(0, 4);
        setPesan([{
          dari: 'bot',
          teks: sapaanTemplate,
          pilihan: (utama.length > 0 ? utama : list.slice(0, 4)).map(f => ({ label: f.pertanyaan, jawabanId: f.id })),
        }]);
      })
      .catch(() => {
        setPesan([{ dari: 'bot', teks: 'Maaf, asisten sedang tidak dapat memuat data. Coba lagi nanti.' }]);
      })
      .finally(() => setFaqLoaded(true));
  }, []);

  useEffect(() => {
    bawahRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pesan, mengetik]);

  const kirimJawabanBot = (entri: FaqItem | null, pertanyaanUser: string) => {
    setPesan(prev => [...prev, { dari: 'user', teks: pertanyaanUser }]);
    setMengetik(true);
    setTimeout(() => {
      setMengetik(false);
      if (!entri) {
        const fallbackPilihan = faqList.filter(f => f.tampilAwal).slice(0, 4);
        setPesan(prev => [...prev, {
          dari: 'bot',
          teks: 'Maaf, saya belum punya jawaban untuk itu. Anda bisa kirim pertanyaan ini ke admin, atau pilih topik lain di bawah:',
          pilihan: fallbackPilihan.map(f => ({ label: f.pertanyaan, jawabanId: f.id })),
          tawarkanKirim: pertanyaanUser,
        }]);
        return;
      }
      const lanjutan = entri.idLanjutan.map(id => faqList.find(f => f.id === id)).filter(Boolean) as FaqItem[];
      setPesan(prev => [...prev, {
        dari: 'bot',
        teks: entri.jawaban,
        ...(lanjutan.length > 0 ? { pilihan: lanjutan.map(f => ({ label: f.pertanyaan, jawabanId: f.id })) } : {}),
      }]);
    }, 550);
  };

  const pilihPertanyaan = (jawabanId: string, label: string) => {
    const entri = faqList.find(f => f.id === jawabanId) || null;
    kirimJawabanBot(entri, label);
  };

  const kirimBebas = (e: React.FormEvent) => {
    e.preventDefault();
    const teks = input.trim();
    if (!teks) return;
    setInput('');
    kirimJawabanBot(cariJawaban(teks, faqList), teks);
  };

  const kirimKeAdmin = async (pertanyaan: string, indexPesan: number) => {
    try {
      await fetch('/api/chatbot/pertanyaan-masuk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pertanyaan, sumberHalaman: sumberLabel || (typeof window !== 'undefined' ? window.location.pathname : '') }),
      });
      setTerkirimId(indexPesan);
      setPesan(prev => [...prev, { dari: 'bot', teks: 'Terima kasih! Pertanyaan Anda sudah dikirim ke admin dan akan segera ditambahkan ke daftar FAQ.' }]);
    } catch {
      setPesan(prev => [...prev, { dari: 'bot', teks: 'Maaf, gagal mengirim pertanyaan. Coba lagi nanti.' }]);
    }
  };

  const resetChat = () => {
    const utama = faqList.filter(f => f.tampilAwal).slice(0, 4);
    setPesan([{
      dari: 'bot', teks: sapaanTemplate,
      pilihan: (utama.length > 0 ? utama : faqList.slice(0, 4)).map(f => ({ label: f.pertanyaan, jawabanId: f.id })),
    }]);
    setTerkirimId(null);
  };

  return (
    <>
      <style>{`
        @keyframes chatSlideIn { from { opacity:0; transform: translateY(16px) scale(0.96); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes dotBounce { 0%,60%,100% { transform: translateY(0); opacity:0.4; } 30% { transform: translateY(-4px); opacity:1; } }
        .chatbot-fab { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .chatbot-fab:hover { transform: scale(1.08); }
        .chatbot-window { animation: chatSlideIn 0.3s cubic-bezier(0.32,0.72,0,1); }
        .chatbot-choice { transition: all 0.2s ease; }
        .chatbot-choice:hover { background: #EFF6FF !important; border-color: ${warna.utama} !important; }
        .chatbot-dot { animation: dotBounce 1.2s infinite ease-in-out; }
        .chatbot-scroll::-webkit-scrollbar { width: 5px; }
        .chatbot-scroll::-webkit-scrollbar-thumb { background: rgba(29,78,216,0.2); border-radius: 100px; }
      `}</style>

      {!terbuka && (
        <button onClick={() => setTerbuka(true)} className="chatbot-fab" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg,${warna.terang},${warna.gelap})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 12px 28px -8px ${warna.utama}70`,
        }}>
          <MessageCircle size={24} color="#fff" strokeWidth={1.8} />
        </button>
      )}

      {terbuka && (
        <div className="chatbot-window" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          width: 340, maxWidth: 'calc(100vw - 32px)', height: 480, maxHeight: 'calc(100vh - 48px)',
          background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(15,23,42,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT,
        }}>
          <div style={{
            background: `linear-gradient(135deg,${warna.terang},${warna.gelap})`, padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={17} color="#fff" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Asisten E-POKJA HUKER</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>Jawab seputar fungsi sistem</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={resetChat} title="Mulai ulang" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 100, color: 'rgba(255,255,255,0.85)', display: 'flex' }}>
                <RotateCcw size={15} />
              </button>
              <button onClick={() => setTerbuka(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 100, color: 'rgba(255,255,255,0.85)', display: 'flex' }}>
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="chatbot-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!faqLoaded && (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Memuat asisten...</div>
            )}
            {pesan.map((p, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: p.dari === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 13px', borderRadius: p.dari === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  background: p.dari === 'user' ? `linear-gradient(135deg,${warna.terang},${warna.gelap})` : '#F1F5F9',
                  color: p.dari === 'user' ? '#fff' : '#1E293B',
                  fontSize: 12.5, lineHeight: 1.6,
                }}>
                  {p.teks}
                </div>
                {p.tawarkanKirim && (
                  terkirimId === i ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#0a5c47', fontWeight: 700 }}>
                      <CheckCircle2 size={13} /> Terkirim ke admin
                    </div>
                  ) : (
                    <button onClick={() => kirimKeAdmin(p.tawarkanKirim!, i)} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10,
                      border: '1px solid rgba(217,119,6,0.3)', background: '#FFFBEB', color: '#92400E',
                      fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                    }}>
                      <Send size={12} /> Kirim Pertanyaan Ini ke Admin
                    </button>
                  )
                )}
                {p.pilihan && p.pilihan.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    {p.pilihan.map((opsi, oi) => (
                      <button key={oi} onClick={() => pilihPertanyaan(opsi.jawabanId, opsi.label)} className="chatbot-choice" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                        padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(29,78,216,0.15)',
                        background: '#fff', color: warna.gelap, fontSize: 11.5, fontWeight: 600,
                        textAlign: 'left', cursor: 'pointer', fontFamily: FONT,
                      }}>
                        {opsi.label}
                        <ChevronRight size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {mengetik && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F1F5F9', padding: '10px 14px', borderRadius: '14px 14px 14px 3px', width: 'fit-content' }}>
                {[0, 1, 2].map(d => (
                  <div key={d} className="chatbot-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            )}
            <div ref={bawahRef} />
          </div>

          <form onSubmit={kirimBebas} style={{ padding: 12, borderTop: '1px solid #F1F5F9', flexShrink: 0, display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ketik pertanyaan..."
              disabled={!faqLoaded}
              style={{
                flex: 1, padding: '9px 13px', borderRadius: 100, border: '1px solid #E2E8F0',
                fontSize: 12.5, fontFamily: FONT, outline: 'none', color: '#1E293B',
              }}
            />
            <button type="submit" disabled={!input.trim()} style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: input.trim() ? `linear-gradient(135deg,${warna.terang},${warna.gelap})` : '#E2E8F0',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}