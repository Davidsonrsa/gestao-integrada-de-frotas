import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ITENS_REVISAO, resumirItensRevisao } from "@/lib/frota-relatorio";

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
} & Partial<Record<(typeof ITENS_REVISAO)[number][0], string | null>>;

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
    const linhasResumo = resumirItensRevisao(equipamentos)
      .map((r) => `<tr><td>${r.equipamentos.map(escapar).join(", ")}</td><td>${r.qtd}</td><td>${escapar(r.tipo)}</td><td>${escapar(r.codigo)}</td><td>${r.total ? `${r.total} ${escapar(r.un)}` : "—"}</td></tr>`)
      .join("");
    const secaoFiltros = comFiltros
      ? `<h2>Filtros e óleos para revisão — resumo por item</h2><table class="resumo"><colgroup><col style="width:44%"><col style="width:8%"><col style="width:23%"><col style="width:17%"><col style="width:8%"></colgroup><thead><tr><th>Equipamentos</th><th>Qtd. equip.</th><th>Item</th><th>Código / especificação</th><th>Total un./L</th></tr></thead><tbody>${linhasResumo || '<tr><td colspan="5">Nenhum item cadastrado</td></tr>'}</tbody></table>`
      : "";
    janela.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório da frota - ${escapar(filtro)}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:11px}h1{font-size:18px}h2{font-size:14px;margin:14px 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid;padding:5px;text-align:left;overflow-wrap:anywhere}.frota th:nth-child(1),.frota td:nth-child(1){width:42px;min-width:42px;max-width:42px}.frota th:nth-child(2),.frota td:nth-child(2){width:80px;min-width:80px;max-width:80px}.frota th:nth-child(3),.frota td:nth-child(3){width:175px;min-width:175px}.resumo{table-layout:fixed}.resumo th,.resumo td{padding:4px 6px}.resumo th:nth-child(2),.resumo td:nth-child(2),.resumo th:nth-child(5),.resumo td:nth-child(5){text-align:center}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>Gestão Integrada de Frotas — ${comFiltros ? "Filtros e óleos para revisão" : "Relatório de equipamentos"}</h1><p>${escapar(filtro)}${busca.trim() ? ` · Busca: ${escapar(busca.trim())}` : ""}${somenteVencidos ? " · Apenas vencidos" : ""}</p><p>Emissão: ${escapar(new Date().toLocaleString("pt-BR"))} · Total: ${equipamentos.length} equipamento(s)</p>${comFiltros ? secaoFiltros : `<table class="frota"><thead><tr>${["CL", "Equipamento", "Identificação", "Placa", "Localização", "Status", "Hr atual", "Hr revisão", "Hr rodado", "Próx. revisão (h)", "Limite (h)"].map((titulo) => `<th>${titulo}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table>`}</body></html>`,
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
