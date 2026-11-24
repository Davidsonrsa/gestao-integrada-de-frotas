import { POSICOES_CAMINHAO, corRecapagem } from "@/lib/pneus";
import foto from "@/assets/caminhao_planta.png";

type Pneu = { codigo: string; recapagens?: number | null; medida?: string | null };

type Props = {
  montados: Map<string, Pneu>;
  posSel: string | null;
  estepe: boolean;
  onClick: (pos: string) => void;
};

/** Caminhão visto de cima: cada roda é clicável e pinta com a cor da recapagem. */
export function CaminhaoPlanta({ montados, posSel, estepe, onClick }: Props) {
  const ep = montados.get("ESTEPE");
  const ec = ep ? corRecapagem(ep.recapagens ?? 0) : null;
  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div className="relative h-[520px] max-h-[62vh]">
          <img
            src={foto}
            alt="Caminhão visto de cima"
            className="block h-full w-auto select-none"
            draggable={false}
          />
          {POSICOES_CAMINHAO.map((r) => {
            const p = montados.get(r.pos);
            const c = p ? corRecapagem(p.recapagens ?? 0) : null;
            const sel = posSel === r.pos;
            return (
              <button
                key={r.pos}
                type="button"
                className="pneu-roda absolute -translate-x-1/2 -translate-y-1/2"
                onClick={() => onClick(r.pos)}
                title={`${r.pos}${p ? ` — ${p.codigo}${p.medida ? ` (${p.medida})` : ""}` : " — vazio"}`}
                style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
              >
                <span
                  className="flex h-full w-full items-center justify-center rounded-[4px] border-2 text-[9px] font-bold leading-none"
                  style={{
                    background: c ? `${c.bg}dd` : "rgba(255,255,255,0.12)",
                    borderColor: sel ? "#f59e0b" : c ? c.bg : "rgba(255,255,255,0.55)",
                    color: c ? c.fg : "#ffffff",
                    boxShadow: sel ? "0 0 0 2px #fbbf24" : "0 1px 2px rgba(0,0,0,.4)",
                  }}
                >
                  {r.pos}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {estepe && (
        <button
          type="button"
          className="pneu-roda mx-auto block h-16 w-16"
          onClick={() => onClick("ESTEPE")}
          title={`ESTEPE${ep ? ` — ${ep.codigo}` : " — vazio"}`}
        >
          <span
            className="flex h-full w-full flex-col items-center justify-center rounded-full border-2 text-[9px] font-bold leading-tight"
            style={{
              background: ec ? `${ec.bg}dd` : "rgba(255,255,255,0.55)",
              borderColor: posSel === "ESTEPE" ? "#f59e0b" : ec ? ec.bg : "#94a3b8",
              color: ec ? ec.fg : "#475569",
              boxShadow: posSel === "ESTEPE" ? "0 0 0 2px #fbbf24" : undefined,
            }}
          >
            ESTEPE
            <span className="font-normal">{ep ? ep.codigo.slice(0, 8) : "vazio"}</span>
          </span>
        </button>
      )}
    </div>
  );
}
