import { useState } from "react";
import { RotateCw } from "lucide-react";
import { MEDIDAS_RE, corRecapagem } from "@/lib/pneus";
import { Button } from "@/components/ui/button";
import foto from "@/assets/retroescavadeira_lateral.png.asset.json";

type Pneu = { codigo: string; recapagens?: number | null; medida?: string | null };

type Props = {
  montados: Map<string, Pneu>;
  posSel: string | null;
  onClick: (pos: string) => void;
};

// Posições das rodas na foto lateral (em %): dianteira e traseira.
const RODAS = [
  { eixo: 1, x: 39.7, y: 79, w: 11 },
  { eixo: 2, x: 62.8, y: 75.5, w: 15 },
];

/** Foto real da retroescavadeira; o botão vira o equipamento para ver o lado E ou D. */
export function Retroescavadeira3D({ montados, posSel, onClick }: Props) {
  const [lado, setLado] = useState<"E" | "D">("E");
  const espelhado = lado === "D";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Lado {lado === "E" ? "esquerdo (E)" : "direito (D)"}</span>
        <Button type="button" size="sm" onClick={() => setLado(espelhado ? "E" : "D")}>
          <RotateCw className="h-4 w-4" /> Virar equipamento
        </Button>
      </div>
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden bg-white">
        <img
          src={foto.url}
          alt="Retroescavadeira"
          className="block w-full select-none transition-transform duration-500"
          style={{ transform: espelhado ? "scaleX(-1)" : undefined }}
          draggable={false}
        />
        {RODAS.map((r) => {
          const pos = `${r.eixo}${lado}`;
          const p = montados.get(pos);
          const c = p ? corRecapagem(p.recapagens ?? 0) : null;
          const sel = posSel === pos;
          const x = espelhado ? 100 - r.x : r.x;
          return (
            <button
              key={pos}
              type="button"
              onClick={() => onClick(pos)}
              title={`${pos}${p ? ` — ${p.codigo}${p.medida ? ` (${p.medida})` : ""}` : " — vazio"}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${x}%`, top: `${r.y}%`, width: `${r.w}%`, aspectRatio: "1" }}
            >
              <span
                className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white shadow ${sel ? "bg-slate-700 ring-2 ring-amber-400" : "bg-slate-900/85"}`}
              >
                {pos}
                <span className="block font-normal">{p ? p.codigo.slice(0, 11) : "vazio"}</span>
                {c && <span className="mt-0.5 block h-1 rounded" style={{ background: c.bg }} />}
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
