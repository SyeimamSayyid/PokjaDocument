'use client';

interface DonutSegment { label: string; value: number; color: string; }

export function DonutChart({ segments, size = 132, thickness = 16, centerLabel, centerSub }: {
  segments: DonutSegment[]; size?: number; thickness?: number; centerLabel?: string; centerSub?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let offsetAcc = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(33,40,66,0.06)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * circumference;
          const gap = circumference - dash;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offsetAcc}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.32,0.72,0,1)' }}
            />
          );
          offsetAcc += dash;
          return el;
        })}
      </svg>
      {(centerLabel || centerSub) && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {centerLabel && <div style={{ fontSize: size * 0.16, fontWeight: 800, color: '#212842', lineHeight: 1 }}>{centerLabel}</div>}
          {centerSub && <div style={{ fontSize: size * 0.075, color: '#94a3b8', fontWeight: 600, marginTop: 3 }}>{centerSub}</div>}
        </div>
      )}
    </div>
  );
}

interface BarGroup { label: string; values: { value: number; color: string }[]; }

export function BarChart({ groups, height = 160, maxValue }: {
  groups: BarGroup[]; height?: number; maxValue?: number;
}) {
  const max = maxValue || Math.max(1, ...groups.flatMap(g => g.values.map(v => v.value)));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height, paddingTop: 10 }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', justifyContent: 'center' }}>
            {g.values.map((v, vi) => (
              <div key={vi} title={String(v.value)} style={{
                width: g.values.length > 1 ? '38%' : '55%',
                height: `${Math.max(3, (v.value / max) * 100)}%`,
                background: v.color, borderRadius: '7px 7px 3px 3px',
                transition: 'height 0.6s cubic-bezier(0.32,0.72,0,1)',
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 10, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap',
                }}>{v.value}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{g.label}</div>
        </div>
      ))}
    </div>
  );
}