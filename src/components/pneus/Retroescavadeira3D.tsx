import { MEDIDAS_RE, corRecapagem } from "@/lib/pneus";

type Pneu = { codigo: string; recapagens?: number | null; medida?: string | null };

type Props = {
  montados: Map<string, Pneu>;
  posSel: string | null;
  onClick: (pos: string) => void;
};

/** Ilustração em perspectiva de retroescavadeira com as 4 posições clicáveis. */
export function Retroescavadeira3D({ montados, posSel, onClick }: Props) {
  const roda = (pos: string, cx: number, cy: number, r: number, longe: boolean) => {
    const p = montados.get(pos);
    const c = p ? corRecapagem(p.recapagens ?? 0) : null;
    const sel = posSel === pos;
    return (
      <g key={pos} onClick={() => onClick(pos)} className="cursor-pointer" opacity={longe ? 0.85 : 1}>
        <title>{`${pos}${p ? ` — ${p.codigo}${p.medida ? ` (${p.medida})` : ""}` : " — vazio"}`}</title>
        {/* banda de rodagem (profundidade) */}
        <ellipse cx={cx + r * 0.25} cy={cy - r * 0.12} rx={r * 0.92} ry={r} fill="#1f2937" />
        <ellipse cx={cx} cy={cy} rx={r * 0.92} ry={r} fill={c ? c.bg : "#f8fafc"} stroke={sel ? "#38bdf8" : p ? "#0f172a" : "#94a3b8"} strokeWidth={sel ? 6 : 3} strokeDasharray={p ? undefined : "8 5"} />
        {/* garras */}
        {p && Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return <line key={i} x1={cx + Math.cos(a) * r * 0.78} y1={cy + Math.sin(a) * r * 0.85} x2={cx + Math.cos(a) * r * 0.9} y2={cy + Math.sin(a) * r * 0.98} stroke={c && c.bg === "#111111" ? "#4b5563" : "#0f172a"} strokeWidth={3} />;
        })}
        <ellipse cx={cx} cy={cy} rx={r * 0.5} ry={r * 0.55} fill="#f59e0b" stroke="#78350f" strokeWidth={2} />
        <ellipse cx={cx} cy={cy} rx={r * 0.18} ry={r * 0.2} fill="#78350f" />
        <rect x={cx - 34} y={cy + r + 6} width={68} height={30} rx={5} fill={sel ? "#0ea5e9" : "#0f172a"} />
        <text x={cx} y={cy + r + 19} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">{pos}</text>
        <text x={cx} y={cy + r + 32} textAnchor="middle" fontSize={10} fill="#fff">{p ? p.codigo.slice(0, 11) : "vazio"}</text>
      </g>
    );
  };

  return (
    <div className="space-y-2">
      <svg viewBox="0 0 720 420" className="mx-auto w-full max-w-2xl">
        <defs>
          <linearGradient id="reCorpo" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <ellipse cx={360} cy={360} rx={320} ry={28} fill="#00000022" />
        {/* rodas do lado oposto (D) */}
        {roda("1D", 250, 268, 50, true)}
        {roda("2D", 530, 240, 82, true)}
        {/* concha dianteira */}
        <path d="M60 300 L160 300 L175 250 L120 230 L50 260 Z" fill="#374151" stroke="#111827" strokeWidth={3} />
        <path d="M150 255 L260 200" stroke="#d97706" strokeWidth={16} strokeLinecap="round" />
        {/* chassi / capô */}
        <path d="M150 230 L420 210 L440 290 L170 300 Z" fill="url(#reCorpo)" stroke="#78350f" strokeWidth={3} />
        <path d="M180 215 L330 205 L335 175 L190 185 Z" fill="#f59e0b" stroke="#78350f" strokeWidth={2} />
        {/* cabine */}
        <path d="M360 110 L470 105 L480 215 L355 222 Z" fill="#0f172a" stroke="#111827" strokeWidth={3} />
        <path d="M372 122 L460 118 L466 205 L368 210 Z" fill="#7dd3fc" opacity={0.55} />
        <path d="M350 100 L485 95 L488 108 L352 113 Z" fill="#111827" />
        {/* braço traseiro */}
        <path d="M470 200 L600 90 L660 120 L640 140 L600 120 L500 220 Z" fill="url(#reCorpo)" stroke="#78350f" strokeWidth={3} />
        <path d="M640 140 L690 250 L660 270 L625 170" fill="#d97706" stroke="#78350f" strokeWidth={3} />
        <path d="M650 262 L700 262 L690 300 L655 290 Z" fill="#374151" />
        {/* rodas do lado próximo (E) */}
        {roda("1E", 215, 300, 50, false)}
        {roda("2E", 490, 280, 82, false)}
      </svg>
      <div className="grid gap-2 text-[11px] sm:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-2"><b>Dianteiros (1E/1D):</b> {MEDIDAS_RE.dianteiro.join(" ou ")}</div>
        <div className="rounded border border-slate-200 bg-white p-2"><b>Traseiros (2E/2D):</b> {MEDIDAS_RE.traseiro.join(", ")}</div>
      </div>
    </div>
  );
}
