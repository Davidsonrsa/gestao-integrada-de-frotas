import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type EquipamentoRelatorio = {
  id: string;
  numero: string;
  identificacao: string | null;
  placa: string | null;
  localizacao: string | null;
  cl: string | null;
  status: string | null;
  horimetro_atual: number | null;
  h_revisao: number | null;
  limite_revisao: number | null;
  proxima_revisao_horimetro: number | null;
} & Partial<Record<(typeof FILTROS)[number][0] | (typeof OLEOS)[number][0], string | null>>;

const FILTROS = [
  ["filtro_lub", "Filtro lubrificante"],
  ["filtro_diesel_p", "Filtro diesel primário"],
  ["filtro_diesel_s", "Filtro diesel secundário"],
  ["filtro_sep_agua", "Filtro separador de água"],
  ["filtro_ar_ext", "Filtro de ar externo"],
  ["filtro_ar_int", "Filtro de ar interno"],
  ["filtro_trans", "Filtro transmissão"],
  ["filtro_hidr", "Filtro hidráulico"],
  ["filtro_respiro", "Filtro de respiro"],
  ["filtro_ar_cond1", "Filtro ar-condicionado 1"],
  ["filtro_ar_cond2", "Filtro ar-condicionado 2"],
] as const;
const OLEOS = [
  ["motor_oleo", "Óleo motor"],
  ["hidraulico_oleo", "Óleo hidráulico"],
  ["transmissao_oleo", "Óleo transmissão"],
  ["eixo_oleo", "Óleo eixo"],
  ["tandem_oleo", "Óleo tandem"],
] as const;

function escapar(valor: unknown): string {
  return String(valor ?? "—").replace(/[&<>"']/g, (caractere) => {
    const entidades: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entidades[caractere] ?? caractere;
  });
}

export function BotaoRelatorioFrota({
  equipamentos,
  cl,
  busca,
  somenteVencidos,
}: {
  equipamentos: EquipamentoRelatorio[];
  cl: string;
  busca: string;
  somenteVencidos: boolean;
}) {
  const [comFiltros, setComFiltros] = useState(false);
  const imprimir = () => {
    if (!equipamentos.length) return;
    const janela = window.open("", "_blank", "width=1000,height=750");
    if (!janela) {
      toast.error("Permita abrir a janela para imprimir o relatório.");
      return;
    }
    janela.opener = null;
    const filtro = cl === "__all" ? "Todas as CL" : `CL ${cl}`;
    const linhas = equipamentos
      .map((e) => {
        const rodado =
          e.horimetro_atual != null && e.h_revisao != null
            ? Math.max(0, e.horimetro_atual - e.h_revisao)
            : null;
        return `<tr>${[e.cl, e.numero, e.identificacao, e.placa, e.localizacao, e.status || "Operacional", e.horimetro_atual, e.h_revisao, rodado, e.proxima_revisao_horimetro, e.limite_revisao ?? 500].map((valor) => `<td>${escapar(valor)}</td>`).join("")}</tr>`;
      })
      .join("");
    const resumo = new Map<string, { tipo: string; qtd: number }>();
    const blocos = equipamentos
      .map((e) => {
        const itens = [...FILTROS, ...OLEOS]
          .map(([campo, nome]) => ({ campo, nome, valor: (e[campo] ?? "").trim() }))
          .filter((i) => i.valor);
        for (const i of itens) {
          const chave = `${i.nome}|${i.valor}`;
          const atual = resumo.get(chave) ?? { tipo: i.nome, qtd: 0 };
          atual.qtd += 1;
          resumo.set(chave, atual);
        }
        const nFiltros = itens.filter((i) => i.campo.startsWith("filtro")).length;
        return `<tr><td>${escapar(e.cl)}</td><td>${escapar(e.numero)}</td><td>${nFiltros}</td><td>${itens.length ? itens.map((i) => `<b>${escapar(i.nome)}:</b> ${escapar(i.valor)}`).join("<br>") : "Nenhum filtro ou óleo cadastrado"}</td></tr>`;
      })
      .join("");
    const linhasResumo = [...resumo.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([chave, r]) => `<tr><td>${escapar(r.tipo)}</td><td>${escapar(chave.split("|").slice(1).join("|"))}</td><td>${r.qtd}</td></tr>`)
      .join("");
    const secaoFiltros = comFiltros
      ? `<h2 style="font-size:14px;margin-top:16px;break-before:page">Filtros e óleos para revisão por equipamento</h2><table><thead><tr><th>CL</th><th>Equipamento</th><th>Qtd filtros</th><th>Filtros e óleos</th></tr></thead><tbody>${blocos}</tbody></table><h2 style="font-size:14px;margin-top:16px">Resumo — quantidade total por item</h2><table><thead><tr><th>Item</th><th>Código / especificação</th><th>Qtd equipamentos</th></tr></thead><tbody>${linhasResumo || '<tr><td colspan="3">Nenhum item cadastrado</td></tr>'}</tbody></table>`
      : "";
    janela.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório da frota - ${escapar(filtro)}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:11px}h1{font-size:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid;padding:5px;text-align:left;overflow-wrap:anywhere}th:nth-child(1),td:nth-child(1){width:42px;min-width:42px;max-width:42px}th:nth-child(2),td:nth-child(2){width:80px;min-width:80px;max-width:80px}th:nth-child(3),td:nth-child(3){width:175px;min-width:175px}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>Gestão Integrada de Frotas — Relatório de equipamentos</h1><p>${escapar(filtro)}${busca.trim() ? ` · Busca: ${escapar(busca.trim())}` : ""}${somenteVencidos ? " · Apenas vencidos" : ""}</p><p>Emissão: ${escapar(new Date().toLocaleString("pt-BR"))} · Total: ${equipamentos.length} equipamento(s)</p><table><thead><tr>${["CL", "Equipamento", "Identificação", "Placa", "Localização", "Status", "Hr atual", "Hr revisão", "Hr rodado", "Próx. revisão (h)", "Limite (h)"].map((titulo) => `<th>${titulo}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table>${secaoFiltros}</body></html>`,
    );
    janela.document.close();
    void janela.document.fonts.ready.then(() => {
      janela.requestAnimationFrame(() => {
        janela.focus();
        janela.print();
      });
    });
  };

  return (
    <div className="flex items-center gap-1">
    <label className="flex items-center gap-1 text-[11px] whitespace-nowrap cursor-pointer" title="Incluir filtros e óleos de cada equipamento no relatório">
      <input type="checkbox" checked={comFiltros} onChange={(ev) => setComFiltros(ev.target.checked)} />
      Filtros/óleos
    </label>
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 px-2 gap-1 text-[11px] whitespace-nowrap" title="Imprimir itens selecionados"
      onClick={imprimir}
      disabled={!equipamentos.length}
    >
      <Printer className="h-4 w-4" /> Imprimir
    </Button>
    </div>
  );
}
