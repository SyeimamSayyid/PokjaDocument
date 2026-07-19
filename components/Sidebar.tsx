'use client';

import { useState, useMemo } from 'react';
import { FiLogOut, FiMenu, FiX, FiChevronDown, FiChevronRight, FiSearch, FiCompass } from 'react-icons/fi';

const INDIGO = '#212842';
const INDIGO_LIGHT = '#31406B';
const CREAM = '#F0E7D5';
const GOLD_ACCENT = '#B5813F';

export interface SidebarItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  notifCount?: number;
}

export interface SidebarExtraItem {
  href: string;
  label: string;
  sublabel?: string;
  pencil?: React.ReactNode; // biasanya <EditPencilIndicator manualLog={...} size={16} />
  active?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  activeHref: string;
  brandLabel: string;
  brandSub: string;
  userName: string;
  userTag: string; // ex: "Admin BNN Utama", "BNNK Toraja"
  accent?: string; // warna aksen — beda per role (indigo/jade/dst)
  onLogout: () => void;
  navSectionTitle?: string;
  navDefaultOpen?: boolean;
  // ── Section tambahan opsional — dipakai di halaman Detail Dokumen buat
  // "loncat" ke dokumen lain tanpa balik ke daftar dulu. Terpisah dari
  // navigasi utama, dan bisa dibuka/tutup sendiri (default: tertutup).
  extraSectionTitle?: string;
  extraItems?: SidebarExtraItem[];
  extraDefaultOpen?: boolean;
}

export default function Sidebar({
  items, activeHref, brandLabel, brandSub, userName, userTag, accent = GOLD_ACCENT, onLogout,
  navSectionTitle = 'Navigasi', navDefaultOpen = true,
  extraSectionTitle, extraItems, extraDefaultOpen = false,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(navDefaultOpen);
  const [extraOpen, setExtraOpen] = useState(extraDefaultOpen);
  const [extraSearch, setExtraSearch] = useState('');
  const inisial = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const extraFiltered = useMemo(() => {
    if (!extraItems) return [];
    const q = extraSearch.trim().toLowerCase();
    if (!q) return extraItems;
    return extraItems.filter(it =>
      it.label.toLowerCase().includes(q) || (it.sublabel || '').toLowerCase().includes(q)
    );
  }, [extraItems, extraSearch]);

  const sectionToggle = (label: string, count: number, open: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        color: 'rgba(240,231,213,0.55)', fontSize: 10.5, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: open ? 6 : 0,
      }}
    >
      {open ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      <span style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(240,231,213,0.1)', padding: '1px 7px', borderRadius: 100 }}>{count}</span>
    </button>
  );

  const content = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 4px 22px', borderBottom: '1px solid rgba(240,231,213,0.1)', marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 8px 18px -6px ${accent}90` }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: INDIGO }}>{brandLabel.charAt(0)}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: CREAM, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{brandLabel}</div>
          <div style={{ fontSize: 10, color: 'rgba(240,231,213,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brandSub}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* ── Navigasi utama — sekarang juga bisa dibuka/tutup ── */}
        <div style={{ marginBottom: extraItems && extraItems.length > 0 ? 4 : 0 }}>
          {sectionToggle(navSectionTitle, items.length, navOpen, () => setNavOpen(v => !v))}
          {navOpen && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {items.map(item => {
                const active = activeHref === item.href;
                return (
                  <a key={item.href} href={item.href} className="sb-item" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '9px 13px', borderRadius: 12,
                    textDecoration: 'none', fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? INDIGO : 'rgba(240,231,213,0.72)',
                    background: active ? CREAM : 'transparent',
                    transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)', position: 'relative',
                  }}>
                    <span style={{ display: 'flex', flexShrink: 0, opacity: active ? 1 : 0.85 }}>{item.icon}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                    {!!item.notifCount && (
                      <span style={{
                        marginLeft: 'auto', fontSize: 9.5, fontWeight: 800, minWidth: 17, height: 17, borderRadius: 100,
                        background: active ? accent : '#A32D2D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                      }}>{item.notifCount}</span>
                    )}
                  </a>
                );
              })}
            </nav>
          )}
        </div>

        {/* ── Section navigasi dokumen lain — terpisah, bisa dibuka/tutup ── */}
        {extraItems && extraItems.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 12, borderTop: '1px solid rgba(240,231,213,0.1)' }}>
            {sectionToggle(extraSectionTitle || 'Dokumen Lain', extraItems.length, extraOpen, () => setExtraOpen(v => !v))}

            {extraOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {extraItems.length > 4 && (
                  <div style={{ position: 'relative', padding: '0 2px' }}>
                    <FiSearch size={12} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,231,213,0.4)' }} />
                    <input
                      value={extraSearch}
                      onChange={e => setExtraSearch(e.target.value)}
                      placeholder="Cari dokumen..."
                      style={{
                        width: '100%', padding: '7px 10px 7px 28px', borderRadius: 10, border: '1px solid rgba(240,231,213,0.14)',
                        background: 'rgba(240,231,213,0.06)', color: CREAM, fontSize: 11, fontFamily: 'inherit',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 240, overflowY: 'auto' }}>
                  {extraFiltered.length === 0 ? (
                    <div style={{ fontSize: 10.5, color: 'rgba(240,231,213,0.35)', padding: '10px 12px', textAlign: 'center' }}>
                      Tidak ada dokumen cocok.
                    </div>
                  ) : extraFiltered.map(it => (
                    <a key={it.href} href={it.href} className="sb-item" style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 10,
                      textDecoration: 'none', fontSize: 11.5, fontWeight: it.active ? 700 : 500,
                      color: it.active ? CREAM : 'rgba(240,231,213,0.62)',
                      background: it.active ? 'rgba(240,231,213,0.12)' : 'transparent',
                      borderLeft: it.active ? `2px solid ${accent}` : '2px solid transparent',
                      transition: 'all 0.2s ease',
                    }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</div>
                        {it.sublabel && (
                          <div style={{ fontSize: 9.5, color: 'rgba(240,231,213,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{it.sublabel}</div>
                        )}
                      </span>
                      {it.pencil && <span style={{ flexShrink: 0, display: 'flex' }}>{it.pencil}</span>}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!navOpen && (!extraItems || extraItems.length === 0) && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,231,213,0.25)' }}>
            <FiCompass size={28} />
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(240,231,213,0.1)', paddingTop: 16, marginTop: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 12px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(150deg,${accent},${INDIGO_LIGHT})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {inisial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: CREAM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: 9.5, color: 'rgba(240,231,213,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userTag}</div>
          </div>
        </div>
        <button onClick={onLogout} className="btn-hover" style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 13px', borderRadius: 12,
          border: '1px solid rgba(240,231,213,0.14)', background: 'rgba(240,231,213,0.05)', color: 'rgba(240,231,213,0.8)',
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <FiLogOut size={15} /> Keluar
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Tombol buka sidebar — mobile saja */}
      <button onClick={() => setMobileOpen(true)} className="sb-mobile-btn" style={{
        display: 'none', position: 'fixed', top: 16, left: 16, zIndex: 90, width: 40, height: 40, borderRadius: 12,
        background: INDIGO, color: CREAM, border: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        boxShadow: '0 8px 20px -6px rgba(33,40,66,0.5)',
      }}>
        <FiMenu size={18} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 98 }} />
      )}

      <aside className={mobileOpen ? 'sb-aside sb-aside-open' : 'sb-aside'} style={{
        width: 236, background: INDIGO, padding: '20px 14px', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100dvh', zIndex: 99, boxSizing: 'border-box',
        boxShadow: '10px 0 40px -20px rgba(0,0,0,0.3)',
      }}>
        {mobileOpen && (
          <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', top: 16, right: 14, background: 'none', border: 'none', color: CREAM, cursor: 'pointer' }}>
            <FiX size={20} />
          </button>
        )}
        {content}
      </aside>

      <style>{`
        .sb-item:hover { background: rgba(240,231,213,0.08) !important; }
        @media (max-width: 900px) {
          .sb-aside { transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
          .sb-aside-open { transform: translateX(0); }
          .sb-mobile-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}