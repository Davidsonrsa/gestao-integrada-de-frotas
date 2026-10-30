import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  escaparHistorico,
  filtrarHistoricoHorimetro,
  formatarDataHistorico,
  formatarHoraHistorico,
  type FiltrosHistoricoHorimetro,
} from "@/lib/horimetro-historico";

export function HistoricoHorimetroDialog() {
  const { isAdmin, userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosHistoricoHorimetro>({
    operador: "",
    equipamento: "",
    inicio: "",
    fim: "",
  });
  const {
    data: registros = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["horimetro-historico", userId],
    enabled: isAdmin && open,
    queryFn: async () => {
      const todos = [];
      // Paginate to avoid silently truncating the administrative report at the Data API row limit.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("horimetro_historico")
          .select("*")
          .order("registrado_em", { ascending: false })
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        todos.push(...(data ?? []));
        if (!data || data.length < 500) return todos;
      }
    },
  });
  if (!isAdmin) return null;
  const filtrados = filtrarHistoricoHorimetro(registros, filtros);
  const periodoInvalido = Boolean(filtros.inicio && filtros.fim && filtros.inicio > filtros.fim);
  const operadores = [
    ...new Map(registros.map((r) => [r.operador_id, r.operador_nome])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const equipamentos = [...new Set(registros.map((r) => r.equipamento_numero))].sort();

  async function imprimir() {
    if (!filtrados.length || periodoInvalido) return;
    const janela = window.open("", "_blank", "width=1100,height=800");
    if (!janela) {
      toast.error("Permita abrir a janela para imprimir o histórico.");
      return;
    }
    janela.opener = null;
    const estilo = getComputedStyle(document.documentElement);
    const papel = estilo.getPropertyValue("--print-paper").trim();
    const tinta = estilo.getPropertyValue("--print-ink").trim();
    const linhas = filtrados
      .map(
        (r) =>
          `<tr>${[
            formatarHoraHistorico(r.registrado_em),
            r.operador_nome,
            r.equipamento_numero,
            r.equipamento_cl,
            r.horimetro_anterior,
            r.horimetro_atual,
            formatarDataHistorico(r.data_horimetro),
            r.endereco || "Localização não informada",
          ]
            .map((v) => `<td>${escaparHistorico(v)}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    const selecao = [
      filtros.operador
        ? `Operador: ${operadores.find(([id]) => id === filtros.operador)?.[1] ?? ""}`
        : "Todos os operadores",
      filtros.equipamento ? `Equipamento: ${filtros.equipamento}` : "Todos os equipamentos",
      filtros.inicio ? `De ${formatarDataHistorico(filtros.inicio)}` : "",
      filtros.fim ? `Até ${formatarDataHistorico(filtros.fim)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    janela.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Histórico de horímetros dos operadores</title><style>@page{size:A4 landscape;margin:10mm}body{font:11px Arial,sans-serif;background:${papel};color:${tinta}}h1{font-size:18px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid;padding:5px;text-align:left;overflow-wrap:anywhere}th:last-child{width:25%}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>Gestão Integrada de Frotas — Histórico de horímetros</h1><p>${escaparHistorico(selecao)}</p><p>${filtrados.length} lançamento(s) · Horários de Brasília · Emissão: ${escaparHistorico(formatarHoraHistorico(new Date().toISOString()))}</p><table><thead><tr>${["Data e hora do lançamento", "Operador", "Equipamento", "CL", "Horímetro anterior (h)", "Horímetro lançado (h)", "Data do horímetro", "Localização"].map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table></body></html>`,
    );
    janela.document.close();
    await janela.document.fonts.ready;
    janela.requestAnimationFrame(() => {
      janela.focus();
      janela.print();
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        title="Histórico de horímetros dos operadores"
        className="h-9 gap-1 px-2 text-[11px]"
        onClick={() => setOpen(true)}
      >
        <History className="h-4 w-4" /> Horímetros
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-6xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Histórico de horímetros dos operadores</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="historico-operador">Operador</Label>
              <Select
                value={filtros.operador || "todos"}
                onValueChange={(v) => setFiltros({ ...filtros, operador: v === "todos" ? "" : v })}
              >
                <SelectTrigger id="historico-operador">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os operadores</SelectItem>
                  {operadores.map(([id, nome]) => (
                    <SelectItem key={id} value={id}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="historico-equipamento">Equipamento</Label>
              <Select
                value={filtros.equipamento || "todos"}
                onValueChange={(v) =>
                  setFiltros({ ...filtros, equipamento: v === "todos" ? "" : v })
                }
              >
                <SelectTrigger id="historico-equipamento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os equipamentos</SelectItem>
                  {equipamentos.map((numero) => (
                    <SelectItem key={numero} value={numero}>
                      {numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="historico-inicio">Data inicial</Label>
              <Input
                id="historico-inicio"
                type="date"
                value={filtros.inicio}
                onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="historico-fim">Data final</Label>
              <Input
                id="historico-fim"
                type="date"
                value={filtros.fim}
                onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {filtrados.length} lançamento(s) · Horário de Brasília
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                title="Atualizar histórico"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                disabled={!filtrados.length || isFetching || Boolean(error) || periodoInvalido}
                onClick={() => void imprimir()}
              >
                <Printer className="mr-1 h-4 w-4" /> Imprimir histórico
              </Button>
            </div>
          </div>
          {periodoInvalido && (
            <p role="alert" className="text-sm text-destructive">
              A data final deve ser igual ou posterior à inicial.
            </p>
          )}
          {isLoading ? (
            <p>Carregando histórico...</p>
          ) : error ? (
            <p role="alert" className="text-destructive">
              Não foi possível carregar o histórico. Tente atualizar.
            </p>
          ) : (
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="bg-muted">
                  <tr>
                    {[
                      "Data e hora",
                      "Operador",
                      "Equipamento / CL",
                      "Hr anterior",
                      "Hr lançado",
                      "Data do horímetro",
                      "Localização",
                    ].map((v) => (
                      <th key={v} className="border-b p-2 text-left">
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r) => (
                    <tr key={r.id}>
                      <td className="border-b p-2 whitespace-nowrap">
                        {formatarHoraHistorico(r.registrado_em)}
                      </td>
                      <td className="border-b p-2">{r.operador_nome}</td>
                      <td className="border-b p-2">
                        {r.equipamento_numero}
                        {r.equipamento_cl ? ` / CL ${r.equipamento_cl}` : ""}
                      </td>
                      <td className="border-b p-2">{r.horimetro_anterior ?? "—"}</td>
                      <td className="border-b p-2 font-semibold">{r.horimetro_atual ?? "—"}</td>
                      <td className="border-b p-2">{formatarDataHistorico(r.data_horimetro)}</td>
                      <td className="border-b p-2 max-w-72 break-words">
                        {r.endereco || "Localização não informada"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtrados.length && (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhum lançamento no período selecionado.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
