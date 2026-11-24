import { POSICOES_CARRO, corRecapagem } from "@/lib/pneus";
import foto from "@/assets/carro_chassi.png";

type Pneu = { codigo: string; recapagens?: number | null; medida?: string | null };

type Props = {
  montados: Map<string, Pneu>;
  posSel: string | null;
  onClick: (pos: string) => void;
};

/** Carro visto de cima (chassi): cada roda e o estepe são clicáveis e pintam com a cor da recapagem. */
export function CarroChassi({ montados, posSel, onClick }: Props) {
  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-[720px]">
        <img
          src={foto}
          alt="Carro visto de cima"
          className="block w-full select-none"
          draggable={false}
        />
        {POSICOES_CARRO.map((r) => {
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
  );
}
