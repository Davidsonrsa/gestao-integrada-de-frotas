import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { custosDoEquipamento, type NotaCustoEquipamento } from "@/lib/equipamento-custos";

const brl = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function EquipamentoCustosNotas({
  equipamento,
  userId,
}: {
  equipamento: { id: string; numero: string; cl: string | null };
  userId: string;
}) {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const periodoInvalido = Boolean(inicio && fim && inicio > fim);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: ["equipamento-custos-notas", userId, equipamento.id, inicio, fim],
    enabled: !periodoInvalido,
    staleTime: 0,
    queryFn: async () => {
      const notas: NotaCustoEquipamento[] = [];
      for (let pagina = 0; ; pagina += 1) {
        let query = supabase
          .from("notas_fiscais")
          .select(
            "id,equipamento_id,identificacao,equipamento,cl,data,nf,descricao_produto,observacao,valor",
          )
          .or(`equipamento_id.eq.${equipamento.id},equipamento_id.is.null`)
          .order("data", { ascending: false, nullsFirst: false })
          .order("id");
        if (inicio) query = query.gte("data", inicio);
        if (fim) query = query.lte("data", fim);
        const { data: paginaNotas, error: erro } = await query.range(
          pagina * 500,
          pagina * 500 + 499,
        );
        if (erro) throw erro;
        notas.push(...(paginaNotas ?? []));
        if (!paginaNotas || paginaNotas.length < 500) break;
      }
      return custosDoEquipamento(notas, equipamento, inicio, fim);
    },
  });

  return (
    <section
      aria-labelledby="custos-notas-titulo"
      className="space-y-4 border-t border-border pt-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="custos-notas-titulo" className="font-semibold flex items-center gap-2">
          <Receipt className="size-4 text-primary" /> Custos do equipamento — Notas fiscais
        </h3>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Atualizar custos"
          title="Atualizar custos"
          disabled={isFetching || periodoInvalido}
          onClick={() => refetch()}
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="custos-data-inicial">Data inicial</Label>
          <Input
            id="custos-data-inicial"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="custos-data-final">Data final</Label>
          <Input
            id="custos-data-final"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      {periodoInvalido ? (
        <p role="alert" className="text-sm text-destructive">
          A data final deve ser igual ou posterior à inicial.
        </p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar os custos. Tente atualizar.
        </p>
      ) : isPending ? (
        <p className="text-sm text-muted-foreground">Carregando custos...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted text-left">
                  <th className="p-2">Data</th>
                  <th className="p-2">NF</th>
                  <th className="p-2">Peça / serviço</th>
                  <th className="p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data?.itens.map((nota) => (
                  <tr key={nota.id} className="border-b border-border">
                    <td className="p-2 whitespace-nowrap">
                      {nota.data ? nota.data.split("-").reverse().join("/") : "—"}
                    </td>
                    <td className="p-2">{nota.nf || "—"}</td>
                    <td className="p-2 min-w-40 break-words">
                      {nota.descricao_produto || nota.observacao || "—"}
                    </td>
                    <td className="p-2 text-right whitespace-nowrap tabular-nums">
                      {brl(Number(nota.valor ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.itens.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma nota fiscal vinculada ao equipamento neste período.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 font-semibold">
            <span>Total do período{!inicio && !fim ? " (todos os registros)" : ""}</span>
            <span className="text-primary tabular-nums" aria-label="Valor total do período">
              {brl(data?.total ?? 0)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
