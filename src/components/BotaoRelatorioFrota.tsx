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
};

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
        return `<tr>${[e.numero, e.identificacao, e.placa, e.cl, e.localizacao, e.status || "Operacional", e.horimetro_atual, e.h_revisao, rodado, e.limite_revisao ?? 500].map((valor) => `<td>${escapar(valor)}</td>`).join("")}</tr>`;
      })
      .join("");
    janela.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório da frota - ${escapar(filtro)}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:11px}h1{font-size:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid;padding:5px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>Gestão Integrada de Frotas — Relatório de equipamentos</h1><p>${escapar(filtro)}${busca.trim() ? ` · Busca: ${escapar(busca.trim())}` : ""}${somenteVencidos ? " · Apenas vencidos" : ""}</p><p>Emissão: ${escapar(new Date().toLocaleString("pt-BR"))} · Total: ${equipamentos.length} equipamento(s)</p><table><thead><tr>${["Equipamento", "Identificação", "Placa", "CL", "Localização", "Status", "Hr atual", "Hr revisão", "Hr rodado", "Limite (h)"].map((titulo) => `<th>${titulo}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table></body></html>`,
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
  );
}
