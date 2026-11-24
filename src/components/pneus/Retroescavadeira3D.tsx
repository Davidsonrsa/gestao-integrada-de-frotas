import { MEDIDAS_RE, corRecapagem } from "@/lib/pneus";
import foto from "@/assets/retroescavadeira_lateral.png.asset.json";

type Pneu = { codigo: string; recapagens?: number | null; medida?: string | null };

type Props = {
  montados: Map<string, Pneu>;
  posSel: string | null;
  onClick: (pos: string) => void;
};

// Posições (em % da foto lateral 433x194): dianteira à esquerda, traseira à direita.
const RODAS = [
  { pos: "1E", x: 39.7, y: 79, d: 12, lado: "E" },
  { pos: "2E", x: 62.8, y: 75.5, d: 16.5, lado: "E" },
  { pos: "1D", x: 39.7, y: 79, d: 12, lado: "D" },
  { pos: "2D", x: 62.8, y: 75.5, d: 16.5, lado: "D" },
] as const;

/** Foto real da retroescavadeira com as 4 posições clicáveis (lado E sobre a roda, lado D acima). */
export function Retroescavadeira3D({ montados, posSel, onClick }: Props) {
  return (
    <div className="space-y-2">
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-lg border bg-white">
        <img src={foto.url} alt="Retroescavadeira" className="block w-full select-none" draggable={false} />
        {RODAS.map((r) => {
          const p = montados.get(r.pos);
          const c = p ? corRecapagem(p.recapagens ?? 0) : null;
          const sel = posSel === r.pos;
          const top = r.lado === "E" ? r.y : r.y - r.d * 2.6 - 8;
          return (
            <button
              key={r.pos}
              type="button"
              onClick={() => onClick(r.pos)}
              title={`${r.pos}${p ? ` — ${p.codigo}${p.medida ? ` (${p.medida})` : ""}` : " — vazio"}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${r.x + (r.lado === "D" ? 4 : 0)}%`, top: `${top}%` }}
            >
              {r.lado === "E" && (
                <span
                  className="block rounded-full"
                  style={{
                    width: `${r.d * 4.33}px`,
                    aspectRatio: "1",
                    minWidth: 36,
                    background: c ? `${c.bg}99` : "transparent",
                    border: `3px ${p ? "solid" : "dashed"} ${sel ? "#0ea5e9" : p ? "#0f172a" : "#f8fafc"}`,
                    boxShadow: sel ? "0 0 0 4px #38bdf855" : undefined,
                  }}
                />
              )}
              <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white shadow ${sel ? "bg-sky-500" : "bg-slate-900/85"}`}>
                {r.pos} {r.lado === "D" ? "(lado oposto)" : ""}
                <span className="block font-normal">{p ? p.codigo.slice(0, 11) : "vazio"}</span>
                {r.lado === "D" && c && <span className="mt-0.5 block h-1 rounded" style={{ background: c.bg }} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-2 text-[11px] sm:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-2"><b>Dianteiros (1E/1D):</b> {MEDIDAS_RE.dianteiro.join(" ou ")}</div>
        <div className="rounded border border-slate-200 bg-white p-2"><b>Traseiros (2E/2D):</b> {MEDIDAS_RE.traseiro.join(", ")}</div>
      </div>
    </div>
  );
}
